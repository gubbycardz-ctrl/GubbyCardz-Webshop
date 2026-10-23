import { describe, expect, it } from "vitest";
import {
  parseCardSetForm,
  parseGameForm,
  parseOfferForm,
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
    const display: Product = { id: "p2", kind: "sealed", name: "Display", slug: "display", gameId: "pokemon" };
    const result = parseProductUpdateForm({ id: "other", kind: "single", name: "151 Display", gameId: "pokemon", setId: "" }, display);
    expect(result).toEqual({ ok: true, value: { ...display, name: "151 Display", slug: "151-display" } });
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
