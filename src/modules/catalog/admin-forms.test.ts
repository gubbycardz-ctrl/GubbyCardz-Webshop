import { describe, expect, it } from "vitest";
import {
  parseCardSetForm,
  parseGameForm,
  parseOfferForm,
  parseOfferInternalsForm,
  parseOfferUpdateForm,
  parseProductForm,
  parseProductUpdateForm,
} from "./admin-forms";
import type { Offer } from "./offer";
import type { Product } from "./product";

describe("parseGameForm", () => {
  it("derives the id from the name", () => {
    expect(parseGameForm({ name: " Pokémon " })).toEqual({ ok: true, value: { id: "pokemon", name: "Pokémon" } });
  });

  it("reports a missing name once, in plain German", () => {
    expect(parseGameForm({ name: "" })).toEqual({ ok: false, error: "Name: bitte ausfüllen" });
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
  it("builds a single card with the number in its slug", () => {
    const result = parseProductForm(
      { kind: "single", name: "Glurak ex", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR" },
      "p1",
    );
    expect(result).toEqual({
      ok: true,
      value: { id: "p1", kind: "single", name: "Glurak ex", slug: "glurak-ex-199-165", gameId: "pokemon", setId: "pokemon-mew", collectorNumber: "199/165", rarity: "SIR" },
    });
  });

  it("requires set, number and rarity for single cards", () => {
    expect(parseProductForm({ kind: "single", name: "Glurak ex", gameId: "pokemon" }, "p1")).toEqual({
      ok: false,
      error: "Set: bitte ausfüllen · Nummer: bitte ausfüllen · Seltenheit: bitte ausfüllen",
    });
  });

  it("builds accessories without game or set", () => {
    const result = parseProductForm({ kind: "accessory", name: "Sleeves schwarz", gameId: "", setId: "" }, "p2");
    expect(result).toEqual({ ok: true, value: { id: "p2", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz" } });
  });

  it("builds sealed products with their category", () => {
    const result = parseProductForm(
      { kind: "sealed", category: "elite-trainer-box", name: "151 Elite Trainer Box", gameId: "pokemon", setId: "pokemon-mew" },
      "p4",
    );
    expect(result).toEqual({
      ok: true,
      value: { id: "p4", kind: "sealed", category: "elite-trainer-box", name: "151 Elite Trainer Box", slug: "151-elite-trainer-box", gameId: "pokemon", setId: "pokemon-mew" },
    });
  });

  it("requires a known category for new sealed products", () => {
    expect(parseProductForm({ kind: "sealed", name: "Display OP-05", gameId: "one-piece" }, "p5")).toEqual({
      ok: false,
      error: "Kategorie: bitte ausfüllen",
    });
    expect(parseProductForm({ kind: "sealed", category: "mystery", name: "Display OP-05", gameId: "one-piece" }, "p5").ok).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(parseProductForm({ kind: "mystery", name: "X" }, "p3").ok).toBe(false);
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

  it("asks for a category when editing a sealed product created before categories existed", () => {
    const legacyDisplay: Product = { id: "p3", kind: "sealed", name: "Display OP-05", slug: "display-op-05", gameId: "one-piece" };
    const fields = { name: "Display OP-05", gameId: "one-piece", setId: "" };
    expect(parseProductUpdateForm(fields, legacyDisplay)).toEqual({ ok: false, error: "Kategorie: bitte ausfüllen" });
    expect(parseProductUpdateForm({ ...fields, category: "display" }, legacyDisplay)).toEqual({
      ok: true,
      value: { ...legacyDisplay, category: "display" },
    });
  });
});

describe("parseOfferForm", () => {
  const ids = { id: "o1", productId: "p1" };

  it("parses German prices and grades", () => {
    const result = parseOfferForm(
      { type: "graded-card", language: "ja", gradingCompany: "bgs", grade: "9,5", certNumber: "123", price: "1.250,00", stock: "1" },
      ids,
    );
    expect(result).toEqual({
      ok: true,
      value: { ...ids, type: "graded-card", language: "ja", gradingCompany: "bgs", grade: 9.5, certNumber: "123", priceCents: 125000, stock: 1 },
    });
  });

  it("rejects prices that are not clear euro amounts", () => {
    const result = parseOfferForm({ type: "accessory", price: "39,999", stock: "1" }, ids);
    expect(result).toEqual({ ok: false, error: "Preis: bitte als Euro-Betrag eingeben, z. B. 39,99" });
  });

  it("rejects fractional or missing stock", () => {
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "1,5" }, ids).ok).toBe(false);
    expect(parseOfferForm({ type: "accessory", price: "8,99", stock: "" }, ids).ok).toBe(false);
  });
});

describe("parseOfferUpdateForm", () => {
  const offer: Offer = { id: "o1", productId: "p1", type: "raw-card", language: "de", condition: "near-mint", priceCents: 3999, stock: 2 };

  it("changes only price and stock", () => {
    expect(parseOfferUpdateForm({ price: "34,50", stock: "0", condition: "poor" }, offer)).toEqual({
      ok: true,
      value: { ...offer, priceCents: 3450, stock: 0 },
    });
  });
});

describe("parseOfferInternalsForm", () => {
  it("parses SKU in upper case, EK in cents and the storage location", () => {
    expect(parseOfferInternalsForm({ sku: " pkm-mew-199-de ", purchasePrice: "1.024,50", storageLocation: " Regal A3 " })).toEqual({
      ok: true,
      value: { sku: "PKM-MEW-199-DE", purchasePriceCents: 102450, storageLocation: "Regal A3" },
    });
  });

  it("treats empty fields as not set and allows an EK of zero", () => {
    expect(parseOfferInternalsForm({ sku: "", purchasePrice: " ", storageLocation: "" })).toEqual({ ok: true, value: {} });
    expect(parseOfferInternalsForm({ purchasePrice: "0" })).toEqual({ ok: true, value: { purchasePriceCents: 0 } });
  });

  it("rejects unclear EK amounts and SKUs with spaces", () => {
    expect(parseOfferInternalsForm({ purchasePrice: "24,555" })).toEqual({ ok: false, error: "EK: bitte als Euro-Betrag eingeben, z. B. 24,50" });
    expect(parseOfferInternalsForm({ sku: "PKM 199" })).toEqual({ ok: false, error: "SKU: Nur Großbuchstaben, Ziffern und . _ / -" });
  });
});
