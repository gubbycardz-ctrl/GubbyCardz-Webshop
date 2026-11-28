import { z } from "zod";
import type { SourceResult, SourceSet } from "../set-sync";
import type { GetJson } from "./fetchers";

// Disney Lorcana sets from Lorcast (https://lorcast.com), a community card database. English only.
// Scope: the numbered main sets. Promo and event sets carry codes like "P1", "cp" or "RPH" whose meaning
// the source does not explain, so they are listed as skipped instead of guessed at.

export const LORCAST_API = "https://api.lorcast.com/v0";
export const LORCAST_SOURCE = "lorcast";
export const LORCANA_GAME_ID = "lorcana";

const setsSchema = z.object({
  results: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      released_at: z.iso.date().nullable(),
      prereleased_at: z.iso.date().nullable().optional(),
    }),
  ),
});

export async function fetchLorcanaSets(getJson: GetJson): Promise<SourceResult> {
  const parsed = setsSchema.safeParse(await getJson(`${LORCAST_API}/sets`));
  if (!parsed.success) throw new Error("Unexpected data for the Lorcast set list");

  const sets: SourceSet[] = [];
  const skipped: SourceResult["skipped"] = [];
  for (const set of parsed.data.results) {
    if (!/^\d+$/.test(set.code)) {
      skipped.push({ name: set.name, code: set.code, reason: "Not a numbered main set (promo or event set)" });
    } else if (!set.released_at) {
      skipped.push({ name: set.name, code: set.code, reason: "No release date yet" });
    } else {
      sets.push({
        id: `${LORCANA_GAME_ID}-${set.code}`,
        gameId: LORCANA_GAME_ID,
        source: LORCAST_SOURCE,
        sourceId: `${LORCAST_SOURCE}:${set.code}`,
        region: "international",
        code: set.code,
        name: set.name,
        nameEn: set.name,
        setType: "main",
        releaseDate: set.released_at,
        // Only worth storing when the pre-release really comes first.
        ...(set.prereleased_at && set.prereleased_at < set.released_at && { preReleaseDate: set.prereleased_at }),
      });
    }
  }
  return { sets: sets.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)), skipped };
}
