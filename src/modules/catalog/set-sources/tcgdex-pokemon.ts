import { z } from "zod";
import { mapWithLimit } from "@/shared/concurrency";
import type { CardSet } from "../game";
import type { SourceSet } from "../set-sync";
import { toSlug } from "../slug";

// Pokémon sets from TCGdex (https://tcgdex.dev), an open, multilingual card database.
// Scope decided by the shop owner: Sword & Shield, Scarlet & Violet and Mega Evolution, in English,
// German and Japanese. Pokémon TCG Pocket (the mobile game) is left out on purpose: it has no cards to sell.

export const TCGDEX_API = "https://api.tcgdex.net/v2";
export const TCGDEX_SOURCE = "tcgdex";
export const POKEMON_GAME_ID = "pokemon";

/** Reads JSON from a URL – injected, so the adapter never touches the network itself. */
export type GetJson = (url: string) => Promise<unknown>;

// TCGdex series ids per market. English and German share ids, Japan has its own.
const ERAS = [
  { international: "swsh", japan: "S" },
  { international: "sv", japan: "SV" },
  { international: "me", japan: "M" },
] as const;

// The source is polite-use: a handful of requests at a time is plenty for ~150 sets.
const CONCURRENCY = 6;

const seriesSchema = z.object({ name: z.string(), sets: z.array(z.object({ id: z.string(), name: z.string() })) });
const setSchema = z.object({
  id: z.string(),
  name: z.string(),
  releaseDate: z.iso.date(),
  abbreviation: z.object({ official: z.string().optional() }).optional(),
});

export async function fetchPokemonSets(getJson: GetJson): Promise<SourceSet[]> {
  const eras = await mapWithLimit(ERAS, 3, async (era) => {
    const [english, german, japanese] = await Promise.all([
      readSeries(getJson, "en", era.international),
      readSeries(getJson, "de", era.international),
      readSeries(getJson, "ja", era.japan),
    ]);
    return { era: english.name, english: english.sets, german: new Map(german.sets.map((set) => [set.id, set.name])), japanese: japanese.sets };
  });

  const international = await mapWithLimit(
    eras.flatMap(({ era, english, german }) => english.map((set) => ({ era, id: set.id, nameDe: german.get(set.id) }))),
    CONCURRENCY,
    async ({ era, id, nameDe }): Promise<SourceSet> => {
      const detail = await readSet(getJson, "en", id);
      return {
        id: `${POKEMON_GAME_ID}-${toSlug(id)}`,
        gameId: POKEMON_GAME_ID,
        source: TCGDEX_SOURCE,
        sourceId: `${TCGDEX_SOURCE}:en/${id}`,
        region: "international",
        code: detail.abbreviation?.official ?? id.toUpperCase(),
        name: detail.name,
        nameEn: detail.name,
        ...(nameDe && { nameDe }),
        era,
        ...optionalType(internationalSetType(id)),
        releaseDate: detail.releaseDate,
      };
    },
  );

  const japan = await mapWithLimit(
    eras.flatMap(({ era, japanese }) => japanese.map((set) => ({ era, id: set.id }))),
    CONCURRENCY,
    async ({ era, id }): Promise<SourceSet> => {
      const detail = await readSet(getJson, "ja", id);
      return {
        id: `${POKEMON_GAME_ID}-jp-${toSlug(id)}`,
        gameId: POKEMON_GAME_ID,
        source: TCGDEX_SOURCE,
        sourceId: `${TCGDEX_SOURCE}:ja/${id}`,
        region: "japan",
        // Japanese sets carry no international abbreviation; their printed code is the id (e.g. "SV1S").
        code: id,
        name: detail.name,
        nameJa: detail.name,
        era,
        ...optionalType(japanSetType(id)),
        releaseDate: detail.releaseDate,
      };
    },
  );

  return [...international, ...japan].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.id.localeCompare(b.id));
}

// The type is only set where the id says it for certain. Numbered sets are main sets, ".5" sets are the
// special sets in between, "…p" are promos. Everything else (subsets, collections) stays open for the admin.
function internationalSetType(id: string): CardSet["setType"] {
  if (/^(swsh|sv|me)p$/.test(id)) return "promo";
  if (/^(swsh|sv|me)\d+$/.test(id)) return "main";
  if (/^(swsh|sv|me)\d+\.5$/.test(id)) return "special";
  return undefined;
}

// Japanese suffixes are not reliable enough to tell main from special sets; only promos are certain.
function japanSetType(id: string): CardSet["setType"] {
  return /^(S|SV|M)-P$/.test(id) ? "promo" : undefined;
}

function optionalType(setType: CardSet["setType"]) {
  return setType ? { setType } : {};
}

async function readSeries(getJson: GetJson, language: string, seriesId: string) {
  return parse(seriesSchema, await getJson(`${TCGDEX_API}/${language}/series/${encodeURIComponent(seriesId)}`), `series ${language}/${seriesId}`);
}

async function readSet(getJson: GetJson, language: string, setId: string) {
  return parse(setSchema, await getJson(`${TCGDEX_API}/${language}/sets/${encodeURIComponent(setId)}`), `set ${language}/${setId}`);
}

function parse<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new Error(`Unexpected data for ${what}`);
  return result.data;
}
