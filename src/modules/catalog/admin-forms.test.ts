import { describe, expect, it } from "vitest";
import {
  parseCardSetForm,
  parseCardSetEditForm,
  parseGameEditForm,
  parseGameForm,
  parseNewProductForm,
  parseOfferForm,
  parseOfferInternalsForm,
  parseOfferUpdateForm,
  parseProductForm,
  parseProductUpdateForm,
} from "./admin-forms";
import type { CardSet } from "./game";
import type { Offer } from "./offer";
import type { Product } from "./product";

describe("parseGameForm", () => {
  it("derives the id from the name", () => {
    expect(parseGameForm({ name: " Pokémon " })).toEqual({ ok: true, value: { id: "pokemon", name: "Pokémon" } });
  });

  it("reports a missing name once, in plain English", () => {
    expect(parseGameForm({ name: "" })).toEqual({ ok: false, error: "Name: required" });
  });
});

describe("parseCardSetForm", () => {
  it("derives a unique id from game and code and drops an empty date", () => {
    expect(parseCardSetForm({ gameId: "one-piece", name: "Awakening", code: "OP-05", releaseDate: "" })).toEqual({
      ok: true,
      value: { id: "one-piece-op-05", gameId: "one-piece", name: "Awakening", code: "OP-05" },
    });
  });

  it("rejects malformed dates", () => {
    expect(parseCardSetForm({ gameId: "pokemon", name: "151", code: "MEW", releaseDate: "22.09.2023" }).ok).toBe(false);
  });
});

describe("parseProductForm", () => {
  const createdAt = "2026-10-23T12:00:00.000Z";

  it("builds a single card with the number in its slug", () => {
    const result = parseProductForm(
      { kind: "single", name: "Glurak ex", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR" },
      { id: "p1", createdAt },
    );
    expect(result).toEqual({
      ok: true,
      value: { id: "p1", kind: "single", name: "Glurak ex", slug: "glurak-ex-199-165", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR", createdAt: "2026-10-23T12:00:00.000Z" },
    });
  });

  it("requires set, number and rarity for single cards", () => {
    expect(parseProductForm({ kind: "single", name: "Glurak ex", gameId: "pokemon" }, { id: "p1", createdAt })).toEqual({
      ok: false,
      error: "Set: required · Number: required · Rarity: required",
    });
  });

  it("builds accessories without game or set", () => {
    const result = parseProductForm({ kind: "accessory", name: "Sleeves schwarz", gameId: "", setId: "" }, { id: "p2", createdAt });
    expect(result).toEqual({ ok: true, value: { id: "p2", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz", createdAt: "2026-10-23T12:00:00.000Z" } });
  });

  it("builds sealed products with their category", () => {
    const result = parseProductForm(
      { kind: "sealed", category: "elite-trainer-box", name: "151 Elite Trainer Box", gameId: "pokemon", setId: "pokemon-mew" },
      { id: "p4" },
    );
    expect(result).toEqual({
      ok: true,
      value: { id: "p4", kind: "sealed", category: "elite-trainer-box", name: "151 Elite Trainer Box", slug: "151-elite-trainer-box", gameId: "pokemon", setId: "pokemon-mew" },
    });
  });

  it("requires a known category for new sealed products", () => {
    expect(parseProductForm({ kind: "sealed", name: "Display OP-05", gameId: "one-piece" }, { id: "p5" })).toEqual({
      ok: false,
      error: "Category: required",
    });
    expect(parseProductForm({ kind: "sealed", category: "mystery", name: "Display OP-05", gameId: "one-piece" }, { id: "p5" }).ok).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(parseProductForm({ kind: "mystery", name: "X" }, { id: "p3", createdAt }).ok).toBe(false);
  });

  it("leaves out a missing creation date, as on products created before the field existed", () => {
    const result = parseProductForm({ kind: "accessory", name: "Sleeves schwarz" }, { id: "p4" });
    expect(result).toEqual({ ok: true, value: { id: "p4", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz" } });
  });
});

describe("parseProductUpdateForm", () => {
  const product: Product = {
    id: "p1", kind: "single", name: "Glurak xe", slug: "glurak-xe-199-165", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR",
  };

  it("fixes a typo and moves the slug along with the name", () => {
    const result = parseProductUpdateForm(
      { kind: "single", name: "Glurak ex", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR" },
      product,
    );
    expect(result).toEqual({ ok: true, value: { ...product, name: "Glurak ex", slug: "glurak-ex-199-165" } });
  });

  it("keeps id and kind, whatever the form sends", () => {
    const display: Product = { id: "p2", kind: "sealed", category: "display", name: "Display", slug: "display", gameId: "pokemon" };
    const result = parseProductUpdateForm({ id: "other", kind: "single", category: "display", name: "151 Display", gameId: "pokemon", setId: "" }, display);
    expect(result).toEqual({ ok: true, value: { ...display, name: "151 Display", slug: "151-display" } });
  });

  it("keeps the creation time, so an edited product stays under 'Neu im Sortiment'", () => {
    const created: Product = { ...product, createdAt: "2026-10-01T10:00:00.000Z" };
    const result = parseProductUpdateForm({ name: "Glurak ex", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR" }, created);
    expect(result.ok && result.value.createdAt).toBe("2026-10-01T10:00:00.000Z");
  });

  it("asks for a category when editing a sealed product created before categories existed", () => {
    const legacyDisplay: Product = { id: "p3", kind: "sealed", name: "Display OP-05", slug: "display-op-05", gameId: "one-piece" };
    const fields = { name: "Display OP-05", gameId: "one-piece", setId: "" };
    expect(parseProductUpdateForm(fields, legacyDisplay)).toEqual({ ok: false, error: "Category: required" });
    expect(parseProductUpdateForm({ ...fields, category: "display" }, legacyDisplay)).toEqual({
      ok: true,
      value: { ...legacyDisplay, category: "display" },
    });
  });
});

describe("parseNewProductForm", () => {
  const ids = { productId: "p1", offerId: "o1", createdAt: "2026-01-01T00:00:00.000Z" };
  const sleeves = { kind: "accessory", name: "Sleeves schwarz" };
  const firstOffer = { withOffer: "on", type: "accessory", price: "8,99", stock: "20", taxScheme: "standard", purchasePrice: "4,50", origin: "commercial" };

  it("builds the product with its first offer and the internal data", () => {
    const result = parseNewProductForm({ ...sleeves, ...firstOffer, sku: "acc-1" }, ids);
    expect(result).toEqual({
      ok: true,
      value: {
        product: { id: "p1", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz", createdAt: ids.createdAt },
        firstOffer: {
          offer: { id: "o1", productId: "p1", type: "accessory", priceCents: 899, stock: 20, taxScheme: "standard" },
          internals: { sku: "ACC-1", purchasePriceCents: 450, origin: "commercial" },
        },
      },
    });
  });

  it("builds only the product when no offer is wanted, ignoring offer fields", () => {
    const result = parseNewProductForm({ ...sleeves, price: "kaputt" }, ids);
    expect(result).toMatchObject({ ok: true, value: { product: { id: "p1" } } });
    expect(result.ok && result.value.firstOffer).toBeUndefined();
  });

  it("reports problems of product and offer together", () => {
    const result = parseNewProductForm({ ...sleeves, ...firstOffer, name: "", stock: "", origin: "" }, ids);
    expect(result).toEqual({ ok: false, error: "Name: required · Stock: required · Origin: required" });
  });

  it("rejects an offer type that does not fit the product kind", () => {
    const result = parseNewProductForm({ ...sleeves, ...firstOffer, type: "sealed", language: "de" }, ids);
    expect(result).toEqual({ ok: false, error: "Offer type: does not fit the product type" });
  });
});

describe("parseOfferForm", () => {
  const ids = { id: "o1", productId: "p1" };

  it("parses German prices and grades", () => {
    const result = parseOfferForm(
      { type: "graded-card", language: "ja", gradingCompany: "bgs", grade: "9,5", certNumber: "123", price: "1.250,00", stock: "1", taxScheme: "margin" },
      ids,
    );
    expect(result).toEqual({
      ok: true,
      value: { ...ids, type: "graded-card", language: "ja", gradingCompany: "bgs", grade: 9.5, certNumber: "123", priceCents: 125000, stock: 1, taxScheme: "margin" },
    });
  });

  it("rejects prices that are not clear euro amounts", () => {
    const result = parseOfferForm({ type: "accessory", price: "39,999", stock: "1", taxScheme: "standard" }, ids);
    expect(result).toEqual({ ok: false, error: "Price: enter a euro amount, e.g. 39.99" });
  });

  it("rejects fractional or missing stock", () => {
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "1,5", taxScheme: "standard" }, ids).ok).toBe(false);
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "", taxScheme: "standard" }, ids).ok).toBe(false);
  });

  it("requires a known tax scheme", () => {
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "1", taxScheme: "" }, ids)).toEqual({
      ok: false,
      error: "Tax scheme: required",
    });
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "1", taxScheme: "zero" }, ids).ok).toBe(false);
  });
});

describe("parseOfferUpdateForm", () => {
  const offer: Offer = { id: "o1", productId: "p1", type: "raw-card", language: "de", condition: "near-mint", priceCents: 3999, stock: 2, taxScheme: "margin" };

  it("changes only price, stock and tax scheme", () => {
    expect(parseOfferUpdateForm({ price: "34,50", stock: "0", condition: "poor", taxScheme: "standard" }, offer)).toEqual({
      ok: true,
      value: { ...offer, priceCents: 3450, stock: 0, taxScheme: "standard" },
    });
  });

  it("asks for the tax scheme when editing an offer created before it existed", () => {
    const legacyOffer: Offer = { ...offer, taxScheme: undefined };
    expect(parseOfferUpdateForm({ price: "34,50", stock: "2" }, legacyOffer)).toEqual({ ok: false, error: "Tax scheme: required" });
  });
});

describe("parseOfferInternalsForm", () => {
  it("parses SKU in upper case, EK in cents, origin and the storage location", () => {
    expect(
      parseOfferInternalsForm({ sku: " pkm-mew-199-de ", purchasePrice: "1.024,50", origin: "private", storageLocation: " Regal A3 " }),
    ).toEqual({
      ok: true,
      value: { sku: "PKM-MEW-199-DE", purchasePriceCents: 102450, origin: "private", storageLocation: "Regal A3" },
    });
  });

  it("treats empty SKU and storage location as not set and allows an EK of zero", () => {
    expect(parseOfferInternalsForm({ sku: "", purchasePrice: "0", origin: "commercial", storageLocation: "" })).toEqual({
      ok: true,
      value: { purchasePriceCents: 0, origin: "commercial" },
    });
  });

  it("requires EK and origin, because the margin scheme needs them per item", () => {
    expect(parseOfferInternalsForm({ purchasePrice: " ", origin: "" })).toEqual({
      ok: false,
      error: "Purchase price: required · Origin: required",
    });
  });

  it("rejects unclear EK amounts and SKUs with spaces", () => {
    expect(parseOfferInternalsForm({ purchasePrice: "24,555", origin: "private" })).toEqual({
      ok: false,
      error: "Purchase price: enter a euro amount, e.g. 24.50",
    });
    expect(parseOfferInternalsForm({ sku: "PKM 199", purchasePrice: "1", origin: "private" })).toEqual({
      ok: false,
      error: "SKU: Nur Großbuchstaben, Ziffern und . _ / -",
    });
  });
});

describe("parseProductForm – visibility", () => {
  const sleeves = { kind: "accessory", name: "Sleeves schwarz" };
  const ids = { id: "p1", createdAt: "2026-01-01T00:00:00.000Z" };

  it("creates visible products unless the hidden box is ticked", () => {
    const result = parseProductForm(sleeves, ids);
    expect(result.ok && result.value).not.toHaveProperty("hidden");
    expect(parseProductForm({ ...sleeves, hidden: "on" }, ids)).toMatchObject({ ok: true, value: { hidden: true } });
  });

  it("lets an edit publish a hidden product again by leaving the box unticked", () => {
    const hidden: Product = { id: "p1", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz", hidden: true };
    const result = parseProductUpdateForm({ name: "Sleeves schwarz" }, hidden);
    expect(result.ok && result.value).not.toHaveProperty("hidden");
  });
});

describe("parseGameEditForm", () => {
  it("renames a TCG and keeps its id", () => {
    expect(parseGameEditForm({ name: "  Pokémon " }, { id: "pokemon", name: "pokemon" })).toEqual({ ok: true, value: { id: "pokemon", name: "Pokémon" } });
  });

  it("does not accept an empty name", () => {
    expect(parseGameEditForm({ name: "" }, { id: "pokemon", name: "pokemon" })).toEqual({ ok: false, error: "Name: required" });
  });
});

describe("parseCardSetEditForm", () => {
  const synced: CardSet = {
    id: "pokemon-sv08-5",
    gameId: "pokemon",
    name: "Prismatic Evolutions",
    code: "PRE",
    releaseDate: "2025-01-17",
    nameEn: "Prismatic Evolutions",
    nameDe: "Prismatische Entwicklungen",
    era: "Scarlet & Violet",
    setType: "special",
    region: "international",
    status: "released",
    source: "tcgdex",
    sourceId: "tcgdex:en/sv08.5",
    verifiedAt: "2026-11-25",
  };
  const fields = { name: "Prismatic Evolutions", code: "PRE", releaseDate: "2025-01-17", nameEn: "Prismatic Evolutions", nameDe: "Prismatische Evolution", era: "Scarlet & Violet", setType: "special", status: "released" };

  it("takes the corrected values and takes the set over from the source, so the sync no longer overwrites it", () => {
    const result = parseCardSetEditForm(fields, synced);
    expect(result).toMatchObject({ ok: true, value: { id: "pokemon-sv08-5", nameDe: "Prismatische Evolution", sourceId: "tcgdex:en/sv08.5", region: "international" } });
    expect(result.ok && result.value).not.toHaveProperty("source");
  });

  it("removes fields that were emptied", () => {
    const result = parseCardSetEditForm({ ...fields, nameDe: "", setType: "", era: "" }, synced);
    expect(result.ok && result.value).not.toHaveProperty("nameDe");
    expect(result.ok && result.value).not.toHaveProperty("setType");
    expect(result.ok && result.value).not.toHaveProperty("era");
  });

  it("rejects a missing name or code and an unknown type, in plain English", () => {
    expect(parseCardSetEditForm({ ...fields, name: "", code: "" }, synced)).toEqual({ ok: false, error: "Name: required · Set code: required" });
    expect(parseCardSetEditForm({ ...fields, setType: "huge" }, synced).ok).toBe(false);
  });
});
