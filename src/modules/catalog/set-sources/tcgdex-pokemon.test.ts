import { describe, expect, it } from "vitest";
import { fetchPokemonSets, type GetJson } from "./tcgdex-pokemon";

// A few real-looking answers of the source, enough to check mapping and scope.
const responses: Record<string, unknown> = {
  "en/series/sv": { name: "Scarlet & Violet", sets: [{ id: "sv01", name: "Scarlet & Violet" }, { id: "sv03.5", name: "151" }, { id: "svp", name: "SVP Black Star Promos" }, { id: "sve", name: "Scarlet & Violet Energies" }] },
  "de/series/sv": { name: "Karmesin & Purpur", sets: [{ id: "sv01", name: "Karmesin & Purpur" }, { id: "sv03.5", name: "151" }] },
  "ja/series/SV": { name: "ポケモンカードゲーム スカーレット&バイオレット", sets: [{ id: "SV1S", name: "スカーレットex" }, { id: "SV-P", name: "SVプロモ" }] },
  "en/series/swsh": { name: "Sword & Shield", sets: [] },
  "de/series/swsh": { name: "Schwert & Schild", sets: [] },
  "ja/series/S": { name: "剣と盾", sets: [] },
  "en/series/me": { name: "Mega Evolution", sets: [{ id: "me01", name: "Mega Evolution" }] },
  "de/series/me": { name: "Mega-Entwicklung", sets: [] },
  "ja/series/M": { name: "MEGA", sets: [] },
  "en/sets/sv01": { id: "sv01", name: "Scarlet & Violet", releaseDate: "2023-03-31", abbreviation: { official: "SVI" } },
  "en/sets/sv03.5": { id: "sv03.5", name: "151", releaseDate: "2023-09-22", abbreviation: { official: "MEW" } },
  "en/sets/svp": { id: "svp", name: "SVP Black Star Promos", releaseDate: "2023-03-31" },
  "en/sets/sve": { id: "sve", name: "Scarlet & Violet Energies", releaseDate: "2023-03-31", abbreviation: { official: "SVE" } },
  "en/sets/me01": { id: "me01", name: "Mega Evolution", releaseDate: "2025-09-26", abbreviation: { official: "MEG" } },
  "ja/sets/SV1S": { id: "SV1S", name: "スカーレットex", releaseDate: "2023-01-20" },
  "ja/sets/SV-P": { id: "SV-P", name: "SVプロモ", releaseDate: "2023-01-20" },
};

function source(): { getJson: GetJson; calls: string[] } {
  const calls: string[] = [];
  const getJson: GetJson = async (url) => {
    calls.push(url);
    const key = url.replace("https://api.tcgdex.net/v2/", "");
    if (!(key in responses)) throw new Error(`unexpected request ${key}`);
    return responses[key];
  };
  return { getJson, calls };
}

describe("fetchPokemonSets", () => {
  it("maps international sets with English and German names, era, code and type", async () => {
    const sets = await fetchPokemonSets(source().getJson);
    const international = sets.filter((set) => set.region === "international");

    expect(international.find((set) => set.sourceId === "tcgdex:en/sv01")).toEqual({
      id: "pokemon-sv01",
      gameId: "pokemon",
      source: "tcgdex",
      sourceId: "tcgdex:en/sv01",
      region: "international",
      code: "SVI",
      name: "Scarlet & Violet",
      nameEn: "Scarlet & Violet",
      nameDe: "Karmesin & Purpur",
      era: "Scarlet & Violet",
      setType: "main",
      releaseDate: "2023-03-31",
    });
    expect(international.find((set) => set.id === "pokemon-sv03-5")).toMatchObject({ code: "MEW", setType: "special", nameDe: "151" });
  });

  it("types only what the id states for sure and falls back to the id as code", async () => {
    const sets = await fetchPokemonSets(source().getJson);
    expect(sets.find((set) => set.id === "pokemon-svp")).toMatchObject({ setType: "promo", code: "SVP" });
    const energies = sets.find((set) => set.id === "pokemon-sve");
    expect(energies).toBeDefined();
    expect(energies).not.toHaveProperty("setType");
  });

  it("keeps Japanese sets apart, with the source id as code and the Japanese name", async () => {
    const sets = await fetchPokemonSets(source().getJson);
    const japan = sets.filter((set) => set.region === "japan");
    expect(japan.map((set) => set.id).sort()).toEqual(["pokemon-jp-sv-p", "pokemon-jp-sv1s"]);
    expect(japan.find((set) => set.code === "SV1S")).toMatchObject({ nameJa: "スカーレットex", name: "スカーレットex", era: "Scarlet & Violet", releaseDate: "2023-01-20" });
    expect(japan.find((set) => set.code === "SV-P")?.setType).toBe("promo");
  });

  it("lists the newest sets first", async () => {
    const sets = await fetchPokemonSets(source().getJson);
    expect(sets[0].id).toBe("pokemon-me01");
  });

  it("asks only for the three eras – never for Pocket or older series", async () => {
    const { getJson, calls } = source();
    await fetchPokemonSets(getJson);
    expect(calls.every((url) => url.startsWith("https://api.tcgdex.net/v2/"))).toBe(true);
    expect(calls.some((url) => /tcgp|misc|\/base/.test(url))).toBe(false);
  });

  it("fails clearly on unexpected data instead of importing half of it", async () => {
    const broken: GetJson = async (url) => (url.includes("/sets/sv01") ? { id: "sv01", name: "x", releaseDate: "bald" } : source().getJson(url));
    await expect(fetchPokemonSets(broken)).rejects.toThrow("Unerwartete Daten bei Set en/sv01");
  });
});
