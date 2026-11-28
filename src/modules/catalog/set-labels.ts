import type { CardSet } from "./game";
import { toSlug } from "./slug";

/**
 * Name for customers. Sets from the catalog sync show their German name; a set the admin entered by
 * hand keeps the name as written, even if the sync later added a German name from its source.
 */
export function displaySetName(set: CardSet): string {
  return set.source && set.nameDe ? set.nameDe : set.name;
}

/** One line for pickers and lists, e.g. "Scarlet & Violet—151 / Karmesin & Purpur – 151 (MEW)". */
export function describeCardSet(set: CardSet): string {
  const names = [set.nameEn ?? set.name, set.nameDe].filter((name, index, all): name is string => Boolean(name) && all.indexOf(name) === index);
  const region = set.region === "japan" ? " · JP" : "";
  return `${names.join(" / ")} (${set.code})${region}`;
}

/** Sets grouped by era, in order of first appearance; sets without an era come last. */
export function groupSetsByEra(sets: readonly CardSet[]): { era?: string; sets: CardSet[] }[] {
  const groups = new Map<string | undefined, CardSet[]>();
  for (const set of sets) groups.set(set.era, [...(groups.get(set.era) ?? []), set]);
  const withEra = [...groups].filter(([era]) => era !== undefined).map(([era, members]) => ({ era, sets: members }));
  const withoutEra = groups.get(undefined);
  return withoutEra ? [...withEra, { sets: withoutEra }] : withEra;
}

/** Free-text search over names (any language), code and era. Every word has to fit; accents and case do not matter. */
export function matchesSetSearch(set: CardSet, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const texts = [set.name, set.nameEn, set.nameDe, set.nameJa, set.code, set.era].filter((text): text is string => Boolean(text));
  // Japanese names have no ASCII slug, so plain text is compared as well.
  if (texts.join(" ").toLowerCase().includes(trimmed)) return true;
  const haystack = toSlug(texts.join(" "));
  const words = toSlug(trimmed).split("-").filter(Boolean);
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

// Keeps letters of every script (a slug would reduce "スカーレットex" to just "ex"), drops case and punctuation.
export function comparableName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Ids of sets that look like duplicates: same game, market and English name. Only for the admin to look at. */
export function duplicateSetIds(sets: readonly CardSet[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const set of sets) {
    const name = comparableName(set.nameEn ?? set.name);
    if (!name) continue;
    const key = `${set.gameId}|${set.region ?? "international"}|${name}`;
    groups.set(key, [...(groups.get(key) ?? []), set.id]);
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
}

/** Value of the era filter that stands for sets without an era. */
export const NO_ERA = "__none__";

/** Eras of a TCG for a dropdown, the era of the newest set first. Empty when no set has an era. */
export function eraOptions(sets: readonly CardSet[]): { value: string; label: string }[] {
  const newest = new Map<string, string>();
  for (const set of sets) {
    if (set.era) newest.set(set.era, [newest.get(set.era) ?? "", set.releaseDate ?? ""].sort().at(-1) as string);
  }
  if (newest.size === 0) return [];
  const eras = [...newest].sort(([, a], [, b]) => b.localeCompare(a)).map(([era]) => ({ value: era, label: era }));
  return sets.some((set) => !set.era) ? [...eras, { value: NO_ERA, label: "No era" }] : eras;
}

/** The sets of one era, or all sets when `era` is empty. */
export function setsOfEra(sets: readonly CardSet[], era: string): CardSet[] {
  if (!era) return [...sets];
  return sets.filter((set) => (era === NO_ERA ? !set.era : set.era === era));
}
