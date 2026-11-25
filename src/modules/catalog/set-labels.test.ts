import { describe, expect, it } from "vitest";
import type { CardSet } from "./game";
import { NO_ERA, describeCardSet, displaySetName, duplicateSetIds, eraOptions, groupSetsByEra, matchesSetSearch, setsOfEra } from "./set-labels";

const base: CardSet = { id: "s1", gameId: "pokemon", name: "Scarlet & Violet", code: "SVI" };

describe("set labels", () => {
  it("shows English and German names once each, with the code", () => {
    expect(describeCardSet({ ...base, nameEn: "Scarlet & Violet", nameDe: "Karmesin & Purpur" })).toBe("Scarlet & Violet / Karmesin & Purpur (SVI)");
    expect(describeCardSet({ ...base, nameEn: "Scarlet & Violet", nameDe: "Scarlet & Violet" })).toBe("Scarlet & Violet (SVI)");
    expect(describeCardSet(base)).toBe("Scarlet & Violet (SVI)");
  });

  it("marks Japanese sets", () => {
    expect(describeCardSet({ ...base, name: "スカーレットex", code: "SV1S", region: "japan" })).toBe("スカーレットex (SV1S) · JP");
  });

  it("shows customers the German name of synced sets, and the name as written for hand-made ones", () => {
    expect(displaySetName({ ...base, source: "tcgdex", nameDe: "Karmesin & Purpur" })).toBe("Karmesin & Purpur");
    expect(displaySetName({ ...base, source: "tcgdex" })).toBe("Scarlet & Violet");
    // Hand-made: the sync may have filled in nameDe, but the admin's name stays what customers see.
    expect(displaySetName({ ...base, name: "Karmesin & Purpur – 151", nameDe: "151" })).toBe("Karmesin & Purpur – 151");
  });

  it("groups sets by era in order of appearance, sets without an era last", () => {
    const sets: CardSet[] = [
      { ...base, id: "a", era: "Mega Evolution" },
      { ...base, id: "b" },
      { ...base, id: "c", era: "Scarlet & Violet" },
      { ...base, id: "d", era: "Mega Evolution" },
    ];
    expect(groupSetsByEra(sets).map((group) => [group.era, group.sets.map((set) => set.id)])).toEqual([
      ["Mega Evolution", ["a", "d"]],
      ["Scarlet & Violet", ["c"]],
      [undefined, ["b"]],
    ]);
  });
});

describe("matchesSetSearch", () => {
  const set: CardSet = { ...base, nameEn: "Scarlet & Violet—151", nameDe: "Karmesin & Purpur – 151", nameJa: "スカーレットex", code: "MEW", era: "Scarlet & Violet" };

  it("finds sets by any name, the code or the era, ignoring case and accents", () => {
    for (const query of ["151", "karmesin purpur", "MEW", "mew", "scarlet violet", "スカーレット"]) expect(matchesSetSearch(set, query)).toBe(true);
  });

  it("requires every word and treats an empty search as everything", () => {
    expect(matchesSetSearch(set, "karmesin glurak")).toBe(false);
    expect(matchesSetSearch(set, "   ")).toBe(true);
  });
});

describe("duplicateSetIds", () => {
  it("flags sets with the same game, market and English name – not across markets", () => {
    const sets: CardSet[] = [
      { ...base, id: "a", nameEn: "Crown Zenith" },
      { ...base, id: "b", name: "Crown  Zenith", nameEn: undefined },
      { ...base, id: "c", nameEn: "Crown Zenith", region: "japan" },
      { ...base, id: "d", nameEn: "Other" },
    ];
    expect([...duplicateSetIds(sets)].sort()).toEqual(["a", "b"]);
  });

  it("does not mistake different Japanese names for duplicates just because they share a Latin ending", () => {
    const japanese = { ...base, region: "japan" as const, name: "", nameEn: undefined };
    const sets: CardSet[] = [
      { ...japanese, id: "a", name: "スカーレットex" },
      { ...japanese, id: "b", name: "バイオレットex" },
      { ...japanese, id: "c", name: "スカーレットex" },
    ];
    expect([...duplicateSetIds(sets)].sort()).toEqual(["a", "c"]);
  });
});

describe("eraOptions and setsOfEra", () => {
  const sets: CardSet[] = [
    { ...base, id: "old", era: "Sword & Shield", releaseDate: "2020-02-07" },
    { ...base, id: "old2", era: "Sword & Shield", releaseDate: "2023-01-20" },
    { ...base, id: "new", era: "Scarlet & Violet", releaseDate: "2023-03-31" },
    { ...base, id: "hand" },
  ];

  it("lists eras by their newest set and offers sets without an era last", () => {
    expect(eraOptions(sets)).toEqual([
      { value: "Scarlet & Violet", label: "Scarlet & Violet" },
      { value: "Sword & Shield", label: "Sword & Shield" },
      { value: NO_ERA, label: "No era" },
    ]);
  });

  it("offers no eras at all when no set has one, so the dropdown can stay away", () => {
    expect(eraOptions([{ ...base, id: "a" }])).toEqual([]);
  });

  it("filters sets by era, by no era, or not at all", () => {
    expect(setsOfEra(sets, "Sword & Shield").map((set) => set.id)).toEqual(["old", "old2"]);
    expect(setsOfEra(sets, NO_ERA).map((set) => set.id)).toEqual(["hand"]);
    expect(setsOfEra(sets, "").map((set) => set.id)).toEqual(["old", "old2", "new", "hand"]);
  });
});
