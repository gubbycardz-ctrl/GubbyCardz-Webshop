import { describe, expect, it } from "vitest";
import { fetchLorcanaSets } from "./lorcast-lorcana";

const results = [
  { name: "Promo Set 1", code: "P1", released_at: "2023-08-18", prereleased_at: "2023-08-18" },
  { name: "The First Chapter", code: "1", released_at: "2023-08-18", prereleased_at: "2023-08-18" },
  { name: "Fabled", code: "9", released_at: "2025-08-29", prereleased_at: "2025-08-22" },
  { name: "Challenge Promo", code: "cp", released_at: "2024-05-17", prereleased_at: null },
  { name: "Next Set", code: "15", released_at: null },
];

describe("fetchLorcanaSets", () => {
  it("takes the numbered main sets, newest first, with a pre-release date only where it comes earlier", async () => {
    const { sets } = await fetchLorcanaSets(async () => ({ results }));
    expect(sets.map((set) => set.code)).toEqual(["9", "1"]);
    expect(sets[0]).toEqual({
      id: "lorcana-9",
      gameId: "lorcana",
      source: "lorcast",
      sourceId: "lorcast:9",
      region: "international",
      code: "9",
      name: "Fabled",
      nameEn: "Fabled",
      setType: "main",
      releaseDate: "2025-08-29",
      preReleaseDate: "2025-08-22",
    });
    expect(sets[1]).not.toHaveProperty("preReleaseDate");
  });

  it("reports promo, event and undated sets as skipped instead of guessing", async () => {
    const { skipped } = await fetchLorcanaSets(async () => ({ results }));
    expect(skipped).toEqual([
      { name: "Promo Set 1", code: "P1", reason: "Not a numbered main set (promo or event set)" },
      { name: "Challenge Promo", code: "cp", reason: "Not a numbered main set (promo or event set)" },
      { name: "Next Set", code: "15", reason: "No release date yet" },
    ]);
  });

  it("fails clearly on unexpected data", async () => {
    await expect(fetchLorcanaSets(async () => ({ sets: [] }))).rejects.toThrow("Unexpected data for the Lorcast set list");
  });
});
