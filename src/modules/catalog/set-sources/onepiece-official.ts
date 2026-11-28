import { mapWithLimit } from "@/shared/concurrency";
import type { CardSet } from "../game";
import type { SourceResult, SourceSet } from "../set-sync";
import { toSlug } from "../slug";
import type { GetText } from "./fetchers";

// One Piece Card Game sets from the official English site (https://en.onepiece-cardgame.com). The site is
// plain HTML, so the product list is read with a few narrow patterns; if the layout changes so that nothing
// matches any more, the sync fails loudly instead of importing half a list.

export const ONE_PIECE_SITE = "https://en.onepiece-cardgame.com";
export const ONE_PIECE_SOURCE = "onepiece";
export const ONE_PIECE_GAME_ID = "one-piece";

const LISTS = ["boosters", "decks"] as const;
const MAX_PAGES = 8;
const CONCURRENCY = 3;
// Pre-release dates only appear on the product page, and only newer sets are worth a request.
const PRE_RELEASE_LOOKBACK_DAYS = 60;

type ListEntry = { title: string; href?: string; releaseDate?: string };

export function parseProductList(html: string): ListEntry[] {
  const entries: ListEntry[] = [];
  for (const match of html.matchAll(/<li[^>]*data-cat="[^"]*"[^>]*>([\s\S]*?)<\/li>/g)) {
    const body = match[1];
    const title = body.match(/linkListColTitle">([\s\S]*?)<\/h4>/)?.[1];
    if (!title) continue;
    entries.push({
      title: decodeEntities(title.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
      href: body.match(/href="([^"]+)"/)?.[1],
      releaseDate: body.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/)?.[1],
    });
  }
  return entries;
}

const KIND_PREFIX = /^(PREMIUM EXTRA BOOSTER|PREMIUM BOOSTER|EXTRA BOOSTER|BOOSTER PACK|STARTER DECK EX|STARTER DECK|ULTRA DECK)\b\s*/i;
// "OP-13", "OP01", "ST-01 PRE" and the combined release "OP14-EB04" – in square or full-width brackets.
const CODE = /[[【]\s*((?:OP|EB|PRB|PEB|ST|SD)-?\d{1,2}(?:-EB-?\d{1,2})?)(\s+PRE)?\s*[\]】]/i;

export type ParsedTitle = { code: string; name: string; preRelease: boolean };

/** "BOOSTER PACK -COME IN, WORLD- [OP-19]" → { code: "OP19", name: "COME IN, WORLD" }. Null without a set code. */
export function parseProductTitle(title: string): ParsedTitle | null {
  const match = title.match(CODE);
  if (!match) return null;
  const code = match[1].toUpperCase().replace(/^([A-Z]+)-(\d)/, "$1$2").replace(/-EB-(\d)/, "-EB$1");
  const name = title
    .slice(0, match.index)
    .replace(KIND_PREFIX, "")
    .replace(/^\s*-\s*|\s*-\s*$/g, "")
    .trim();
  return name ? { code, name, preRelease: Boolean(match[2]) } : null;
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs"]);

/** The site shouts some names ("COME IN, WORLD"); those are set in normal capitals, mixed-case names stay as printed. */
export function toDisplayName(name: string): string {
  return name
    .split(" ")
    .map((token, index) => {
      if (token.length < 2 || !/^[A-Z][A-Z’'/,.&-]*$/.test(token)) return token;
      const lower = token.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower.replace(/[,.]/g, ""))) return lower;
      return lower.replace(/(^|[/-])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
    })
    .join(" ");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "February 26, 2027" → "2027-02-26"; null when there is no pre-release date on the page. */
export function parsePreReleaseDate(html: string): string | null {
  const match = html.match(/<dt>\s*Pre-Release Date\s*<\/dt>\s*<dd>\s*(?:<p>)?\s*([A-Za-z]+)\.? (\d{1,2}), (\d{4})/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].slice(0, 3).toLowerCase());
  if (month < 0) return null;
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

export async function fetchOnePieceSets(getText: GetText, { today }: { today: string }): Promise<SourceResult> {
  const entries = new Map<string, ListEntry>();
  for (const list of LISTS) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const found = parseProductList(await getText(`${ONE_PIECE_SITE}/products/?subcategory=${list}&page=${page}`));
      if (page === 1 && found.length === 0) throw new Error(`Unexpected data for the ${list} list`);
      const fresh = found.filter((entry) => !entries.has(`${entry.title}|${entry.releaseDate}`));
      // A page past the end repeats the last one or is empty.
      if (fresh.length === 0) break;
      for (const entry of fresh) entries.set(`${entry.title}|${entry.releaseDate}`, entry);
    }
  }

  const skipped: SourceResult["skipped"] = [];
  const byCode = new Map<string, { parsed: ParsedTitle; entry: ListEntry }>();
  for (const entry of entries.values()) {
    const parsed = parseProductTitle(entry.title);
    if (!parsed || !entry.releaseDate) {
      skipped.push({ name: entry.title, reason: parsed ? "No release date" : "No set code in the title" });
      continue;
    }
    const key = parsed.preRelease ? `${parsed.code}-PRE` : parsed.code;
    if (!byCode.has(key)) byCode.set(key, { parsed, entry });
  }
  if (byCode.size === 0) throw new Error("Unexpected data for the product list");

  const cutoff = new Date(Date.parse(today) - PRE_RELEASE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sets = await mapWithLimit([...byCode], CONCURRENCY, async ([key, { parsed, entry }]): Promise<SourceSet> => {
    const releaseDate = entry.releaseDate as string;
    const lookup = releaseDate >= cutoff && entry.href?.startsWith(`${ONE_PIECE_SITE}/`) && !parsed.preRelease;
    const preReleaseDate = lookup ? parsePreReleaseDate(await getText(entry.href as string)) : null;
    const name = toDisplayName(parsed.name) + (parsed.preRelease ? " (Pre-Release Version)" : "");
    return {
      id: `${ONE_PIECE_GAME_ID}-${toSlug(key)}`,
      gameId: ONE_PIECE_GAME_ID,
      source: ONE_PIECE_SOURCE,
      sourceId: `${ONE_PIECE_SOURCE}:${key}`,
      region: "international",
      code: key,
      name,
      nameEn: name,
      ...productLine(parsed.code),
      releaseDate,
      ...(preReleaseDate && preReleaseDate < releaseDate && { preReleaseDate }),
    };
  });
  return { sets: sets.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.code.localeCompare(b.code)), skipped };
}

// Booster packs (including the combined OP+EB releases) are main sets; extra and premium boosters are special sets.
function productLine(code: string): { era: string; setType: NonNullable<CardSet["setType"]> } {
  if (/^OP\d+/.test(code)) return { era: "Booster Packs", setType: "main" };
  if (/^EB\d+/.test(code)) return { era: "Extra Boosters", setType: "special" };
  if (/^(PRB|PEB)\d+/.test(code)) return { era: "Premium Boosters", setType: "special" };
  return { era: "Starter Decks", setType: "starter" };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
