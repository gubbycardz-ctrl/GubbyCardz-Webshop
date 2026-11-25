import { describe, expect, it } from "vitest";
import type { CardSet } from "./game";
import { planSetSync, type SourceSet } from "./set-sync";

const TODAY = "2026-11-25";

const scarletViolet: SourceSet = {
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
};

const upcoming: SourceSet = { ...scarletViolet, id: "pokemon-me07", sourceId: "tcgdex:en/me07", code: "XYZ", name: "Next Set", nameEn: "Next Set", nameDe: undefined, releaseDate: "2027-03-05" };

// A set entered by hand before the catalog existed.
const handMade: CardSet = { id: "pokemon-svi", gameId: "pokemon", name: "Scarlet & Violet", code: "SVI", releaseDate: "2023-03-31" };

function plan(incoming: SourceSet[], existing: CardSet[] = []) {
  return planSetSync(incoming, existing, { today: TODAY });
}

describe("planSetSync – new sets", () => {
  it("creates released and announced sets with their source, status and check date", () => {
    const { items } = plan([scarletViolet, upcoming]);
    expect(items.map((item) => item.status)).toEqual(["create", "create"]);
    expect(items[0].set).toMatchObject({ id: "pokemon-sv01", status: "released", source: "tcgdex", sourceId: "tcgdex:en/sv01", verifiedAt: TODAY, nameDe: "Karmesin & Purpur" });
    expect(items[1].set).toMatchObject({ status: "announced", releaseDate: "2027-03-05" });
    expect(items[1].set).not.toHaveProperty("nameDe");
  });

  it("is repeatable: a second run over its own result changes nothing", () => {
    const first = plan([scarletViolet, upcoming]);
    const second = plan([scarletViolet, upcoming], first.items.map((item) => item.set));
    expect(second.items.map((item) => item.status)).toEqual(["unchanged", "unchanged"]);
    expect(second.items.flatMap((item) => item.changes)).toEqual([]);
  });
});

describe("planSetSync – sets that came from the source", () => {
  const stored = plan([scarletViolet]).items[0].set;

  it("refreshes what the source changed and says what", () => {
    const { items } = plan([{ ...scarletViolet, releaseDate: "2023-04-07" }], [stored]);
    expect(items[0]).toMatchObject({ status: "update", set: { releaseDate: "2023-04-07", id: stored.id } });
    expect(items[0].changes).toEqual(["Release date: 2023-03-31 → 2023-04-07"]);
  });

  it("turns an announced set into a released one once its date has passed", () => {
    const announced = plan([upcoming]).items[0].set;
    const later = planSetSync([upcoming], [announced], { today: "2027-03-06" });
    expect(later.items[0]).toMatchObject({ status: "update", set: { status: "released" } });
  });

  it("keeps a value the source no longer reports, and keeps archived sets archived", () => {
    const archived = { ...stored, status: "archived" as const };
    const { items } = plan([{ ...scarletViolet, nameDe: undefined }], [archived]);
    expect(items[0].set).toMatchObject({ nameDe: "Karmesin & Purpur", status: "archived" });
    expect(items[0].status).toBe("unchanged");
  });

  it("reports sets the source no longer has, but never drops them", () => {
    const { items, notInSource } = plan([upcoming], [stored]);
    expect(items).toHaveLength(1);
    expect(notInSource.map((set) => set.id)).toEqual([stored.id]);
  });
});

describe("planSetSync – sets entered by hand", () => {
  it("completes a hand-made set found by its code, without touching name and code", () => {
    const { items } = plan([scarletViolet], [{ ...handMade, name: "Karmesin & Purpur", code: "SVI" }]);
    expect(items[0].status).toBe("enrich");
    expect(items[0].set).toMatchObject({ id: "pokemon-svi", name: "Karmesin & Purpur", code: "SVI", era: "Scarlet & Violet", nameEn: "Scarlet & Violet", sourceId: "tcgdex:en/sv01" });
    // It is not adopted by the source, so later runs never overwrite what the admin wrote.
    expect(items[0].set).not.toHaveProperty("source");
  });

  it("finds a hand-made set by its name when the code differs and notes the difference", () => {
    const { items } = plan([scarletViolet], [{ ...handMade, code: "151" }]);
    expect(items[0]).toMatchObject({ status: "enrich", set: { id: "pokemon-svi", code: "151" } });
    expect(items[0].notes).toEqual(["Code differs (existing: 151, source: SVI) – not overwritten"]);
  });

  it("does not overwrite a differing date, it notes it", () => {
    const { items } = plan([scarletViolet], [{ ...handMade, releaseDate: "2023-04-01" }]);
    expect(items[0].set.releaseDate).toBe("2023-04-01");
    expect(items[0].notes).toContain("Release date differs (existing: 2023-04-01, source: 2023-03-31) – not overwritten");
  });

  it("leaves a hand-made set alone on a repeat run once it is linked", () => {
    const linked = plan([scarletViolet], [handMade]).items[0].set;
    expect(plan([scarletViolet], [linked]).items[0].status).toBe("unchanged");
  });

  it("does not merge when two hand-made sets fit – it creates the set and warns about the lookalikes", () => {
    const { items } = plan([scarletViolet], [handMade, { ...handMade, id: "pokemon-svi-2", name: "Scarlet & Violet (zweite)" }]);
    expect(items[0].status).toBe("create");
    expect(items[0].notes[0]).toContain("Possible duplicate");
  });

  it("never matches a Japanese set to a hand-made one", () => {
    const japanese: SourceSet = { ...scarletViolet, id: "pokemon-jp-sv1s", sourceId: "tcgdex:ja/SV1S", region: "japan", code: "SV1S", name: "スカーレットex", nameEn: undefined, nameDe: undefined, nameJa: "スカーレットex" };
    expect(plan([japanese], [handMade]).items[0].status).toBe("create");
  });

  it("lets only one source set claim a hand-made set", () => {
    // Fits the same hand-made set by its code, but is a different set (own name and date).
    const twin: SourceSet = { ...scarletViolet, id: "pokemon-sv01x", sourceId: "tcgdex:en/sv01x", name: "Scarlet & Violet Reprint", nameEn: "Scarlet & Violet Reprint", nameDe: undefined, releaseDate: "2023-04-07" };
    const { items } = plan([scarletViolet, twin], [handMade]);
    expect(items.map((item) => item.status)).toEqual(["enrich", "create"]);
  });
});

describe("planSetSync – contradictory source data", () => {
  const twin = (code: string, overrides: Partial<SourceSet> = {}): SourceSet => ({
    ...scarletViolet,
    id: `pokemon-jp-${code.toLowerCase()}`,
    sourceId: `tcgdex:ja/${code}`,
    region: "japan",
    code,
    name: "トリプレットビート",
    nameEn: undefined,
    nameDe: undefined,
    nameJa: "トリプレットビート",
    releaseDate: "2024-04-26",
    ...overrides,
  });

  it("skips sets with the same name and date in one market and says which ones", () => {
    const { items } = plan([twin("CS1a"), twin("CS1b"), twin("SV1a", { releaseDate: "2023-03-10" })]);
    expect(items.map((item) => item.status)).toEqual(["conflict", "conflict", "create"]);
    expect(items[0].notes).toEqual(["Same name and date as CS1b – the source contradicts itself here, skipped"]);
  });

  it("does not report a skipped set as missing from the source, and leaves a stored one alone", () => {
    const stored = plan([twin("CS1a", { name: "Anderer Name", nameJa: "Anderer Name" })]).items[0].set;
    const { items, notInSource } = plan([twin("CS1a"), twin("CS1b")], [stored]);
    expect(items.every((item) => item.status === "conflict")).toBe(true);
    expect(notInSource).toEqual([]);
  });
});
