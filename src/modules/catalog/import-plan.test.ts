import { describe, expect, it } from "vitest";
import { formatEuro } from "@/shared/money";
import type { CardSet, Game } from "./game";
import { planImport, productSlugsFor, type ExistingOffer, type ImportContext } from "./import-plan";
import type { ImportRow } from "./import-rows";
import type { Product } from "./product";

const pokemon: Game = { id: "pokemon", name: "Pokémon" };
const silverTempest: CardSet = { id: "pokemon-sit", gameId: "pokemon", name: "Silberne Sturmwinde", code: "SIT" };
const NOW = "2026-10-23T12:00:00.000Z";

const bundleRow: ImportRow = {
  line: 2,
  sku: "PKM-SIT-BB-DE-001",
  name: "Silberne Sturmwinde Boosterbundle",
  gameName: "Pokemon",
  setName: "sit",
  kind: "sealed",
  category: "booster-bundle",
  variant: { type: "sealed", language: "de" },
  priceCents: 8000,
  stock: 1,
  purchasePriceCents: 2700,
  taxScheme: "standard",
  origin: "commercial",
  storageLocation: "SEALED-01",
};

const existingBundle: ExistingOffer = {
  product: { id: "p1", kind: "sealed", category: "booster-bundle", name: bundleRow.name, slug: "silberne-sturmwinde-boosterbundle", gameId: "pokemon", setId: silverTempest.id },
  offer: { id: "o1", productId: "p1", type: "sealed", language: "de", priceCents: 7500, stock: 2, taxScheme: "standard" },
  internals: { sku: bundleRow.sku, purchasePriceCents: 2500, origin: "commercial", storageLocation: "SEALED-01" },
};

function context(overrides: Partial<ImportContext> = {}): ImportContext {
  return { games: [pokemon], cardSets: [silverTempest], existingBySku: new Map(), productsBySlug: new Map(), ...overrides };
}

function ids() {
  let next = 0;
  return () => `id-${++next}`;
}

function plan(rows: ImportRow[], ctx = context(), overwriteStock = false) {
  return planImport({ rows, errors: [] }, ctx, { overwriteStock, newId: ids(), now: NOW });
}

describe("planImport – new SKUs", () => {
  it("creates product, offer and internals, resolving game and set loosely", () => {
    const result = plan([bundleRow]);
    expect(result.hasErrors).toBe(false);
    expect(result.rows).toEqual([
      { line: 2, sku: bundleRow.sku, name: bundleRow.name, status: "create", messages: ["Neues Produkt", `VK ${formatEuro(8000)}`, "Bestand 1"] },
    ]);
    expect(result.products).toEqual([
      { id: "id-1", kind: "sealed", category: "booster-bundle", name: bundleRow.name, slug: "silberne-sturmwinde-boosterbundle", gameId: "pokemon", setId: "pokemon-sit", createdAt: NOW },
    ]);
    expect(result.offers).toEqual([
      {
        offer: { id: "id-2", productId: "id-1", type: "sealed", language: "de", priceCents: 8000, stock: 1, taxScheme: "standard" },
        internals: { sku: bundleRow.sku, purchasePriceCents: 2700, origin: "commercial", storageLocation: "SEALED-01" },
      },
    ]);
  });

  it("puts rows with the same product name under one product", () => {
    const english = { ...bundleRow, line: 3, sku: "PKM-SIT-BB-EN-001", variant: { type: "sealed" as const, language: "en" as const } };
    const result = plan([bundleRow, english]);
    expect(result.products).toHaveLength(1);
    expect(result.offers.map(({ offer }) => offer.productId)).toEqual(["id-1", "id-1"]);
    expect(result.rows[1].messages[0]).toBe("Neues Produkt wie in Zeile 2");
  });

  it("adds offers to an existing product with the same name", () => {
    const result = plan([bundleRow], context({ productsBySlug: new Map([[existingBundle.product.slug, existingBundle.product]]) }));
    expect(result.products).toEqual([]);
    expect(result.offers[0].offer.productId).toBe("p1");
    expect(result.rows[0].messages[0]).toBe(`Zu vorhandenem Produkt „${bundleRow.name}“`);
  });

  it("requires stock and purchase data and known game and set, and writes nothing then", () => {
    const incomplete: ImportRow = { ...bundleRow, stock: undefined, purchasePriceCents: undefined, origin: undefined, taxScheme: undefined, setName: "Destined Rivals" };
    const result = plan([incomplete, { ...bundleRow, line: 3, sku: "OK-1", name: "Anderes Bundle" }]);
    expect(result.hasErrors).toBe(true);
    expect(result.products).toEqual([]);
    expect(result.offers).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      status: "error",
      messages: [
        "Bestand: bitte ausfüllen (neuer Artikel)",
        "EK: bitte ausfüllen (neuer Artikel)",
        "Herkunft: bitte ausfüllen (neuer Artikel)",
        "Steuerart: bitte ausfüllen (neuer Artikel)",
        "Set: „Destined Rivals“ gibt es bei Pokémon noch nicht – bitte unter „Spiele & Sets“ anlegen",
      ],
    });
    expect(result.rows[1].status).toBe("create");
  });

  it("rejects a name that belongs to a product of another kind, and duplicate SKUs", () => {
    const accessory: Product = { id: "p9", kind: "accessory", name: "Silberne Sturmwinde Boosterbundle", slug: existingBundle.product.slug };
    const result = plan([bundleRow, { ...bundleRow, line: 5 }], context({ productsBySlug: new Map([[accessory.slug, accessory]]) }));
    expect(result.rows.map((row) => row.messages)).toEqual([
      ["Name: „Silberne Sturmwinde Boosterbundle“ gehört schon zu einem anderen Produkt (andere Produktart oder anderes Spiel)"],
      ["SKU: steht schon in Zeile 2"],
    ]);
  });
});

describe("planImport – known SKUs", () => {
  const known = (existing = existingBundle) => context({ existingBySku: new Map([[existing.internals.sku!, existing]]) });

  it("takes price and storage location, keeps EK and stock and says so", () => {
    const result = plan([{ ...bundleRow, storageLocation: "SEALED-02" }], known());
    expect(result.rows[0]).toMatchObject({
      status: "update",
      messages: [
        `VK ${formatEuro(7500)} → ${formatEuro(8000)}`,
        "Lagerplatz „SEALED-01“ → „SEALED-02“",
        "Bestand bleibt 2 (Datei: 1 – nur mit Häkchen „Bestand übernehmen“)",
        `EK bleibt ${formatEuro(2500)} (wird nie überschrieben)`,
      ],
    });
    expect(result.offers).toEqual([
      { offer: { ...existingBundle.offer, priceCents: 8000 }, internals: { ...existingBundle.internals, storageLocation: "SEALED-02" } },
    ]);
    expect(result.products).toEqual([]);
  });

  it("overwrites stock only on request", () => {
    const result = plan([bundleRow], known(), true);
    expect(result.offers[0].offer.stock).toBe(1);
    expect(result.rows[0].messages).toContain("Bestand 2 → 1");
  });

  it("fills in missing purchase data of older offers", () => {
    const legacy: ExistingOffer = {
      ...existingBundle,
      offer: { ...existingBundle.offer, priceCents: 8000, taxScheme: undefined },
      internals: { sku: bundleRow.sku, storageLocation: "SEALED-01" },
    };
    const result = plan([{ ...bundleRow, stock: 2 }], known(legacy));
    expect(result.rows[0].messages).toEqual(["Steuerart ergänzt: Regelbesteuert (19 %)", `EK ergänzt: ${formatEuro(2700)}`, "Herkunft ergänzt: Gewerblich"]);
    expect(result.offers[0]).toEqual({
      offer: { ...legacy.offer, taxScheme: "standard" },
      internals: { sku: bundleRow.sku, purchasePriceCents: 2700, origin: "commercial", storageLocation: "SEALED-01" },
    });
  });

  it("renames the product, and reports unchanged rows without writing", () => {
    const renamed = plan([{ ...bundleRow, name: "Silver Tempest Booster Bundle", priceCents: 7500, stock: 2, purchasePriceCents: 2500 }], known());
    expect(renamed.rows[0].messages).toEqual(["Name „Silberne Sturmwinde Boosterbundle“ → „Silver Tempest Booster Bundle“"]);
    expect(renamed.products).toEqual([{ ...existingBundle.product, name: "Silver Tempest Booster Bundle", slug: "silver-tempest-booster-bundle" }]);
    expect(renamed.offers).toEqual([]);

    const unchanged = plan([{ ...bundleRow, priceCents: 7500, stock: 2, purchasePriceCents: 2500 }], known());
    expect(unchanged.rows[0]).toMatchObject({ status: "unchanged", messages: [] });
    expect(unchanged.offers).toEqual([]);
  });
});

describe("productSlugsFor", () => {
  it("uses the existing product's number for known SKUs, so renamed singles keep it", () => {
    const single: Product = { id: "s1", kind: "single", name: "Raichu", slug: "raichu-14-102", gameId: "pokemon", setId: "base", collectorNumber: "14/102", rarity: "Holo Rare" };
    const existing = new Map([["SLAB-1", { ...existingBundle, product: single }]]);
    const row: ImportRow = { ...bundleRow, sku: "SLAB-1", name: "Raichu Holo", kind: "single", collectorNumber: "99" };
    expect(productSlugsFor([row, bundleRow], existing)).toEqual(["raichu-holo-14-102", "silberne-sturmwinde-boosterbundle"]);
  });
});
