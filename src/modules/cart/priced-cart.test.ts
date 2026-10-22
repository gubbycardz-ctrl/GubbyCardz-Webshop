import { describe, expect, it } from "vitest";
import type { Offer, Product } from "@/modules/catalog";
import { priceCart } from "./priced-cart";

const glurak: Product = {
  id: "p1",
  kind: "single",
  name: "Glurak ex",
  slug: "glurak-ex-199-165",
  gameId: "pokemon",
  setId: "mew",
  collectorNumber: "199/165",
  rarity: "SIR",
};
const sleeves: Product = { id: "p2", kind: "accessory", name: "Sleeves", slug: "sleeves" };

const offerOf = (id: string, productId: string, priceCents: number, stock: number): Offer => ({
  id,
  productId,
  type: "accessory",
  priceCents,
  stock,
});

const offers = new Map<string, Offer>([
  ["nm", { id: "nm", productId: "p1", type: "raw-card", language: "de", condition: "near-mint", priceCents: 11999, stock: 3 }],
  ["sleeves", offerOf("sleeves", "p2", 899, 1)],
  ["sold-out", offerOf("sold-out", "p2", 500, 0)],
]);
const products = new Map<string, Product>([
  ["p1", glurak],
  ["p2", sleeves],
]);

describe("priceCart", () => {
  it("multiplies current prices in integer cents and sums them", () => {
    const priced = priceCart([{ offerId: "nm", quantity: 2 }], offers, products);

    expect(priced.lines).toEqual([{ offer: offers.get("nm"), product: glurak, quantity: 2, lineTotalCents: 23998 }]);
    expect(priced.subtotalCents).toBe(23998);
    expect(priced.itemCount).toBe(2);
  });

  it("never sells more than in stock", () => {
    const priced = priceCart([{ offerId: "sleeves", quantity: 5 }], offers, products);

    expect(priced.lines[0]).toMatchObject({ quantity: 1, lineTotalCents: 899, issue: "reduced" });
    expect(priced.subtotalCents).toBe(899);
  });

  it("keeps sold-out lines visible but free of charge", () => {
    const priced = priceCart([{ offerId: "sold-out", quantity: 1 }], offers, products);

    expect(priced.lines[0]).toMatchObject({ quantity: 0, lineTotalCents: 0, issue: "sold-out" });
    expect(priced.itemCount).toBe(0);
  });

  it("counts offers that no longer exist", () => {
    const priced = priceCart(
      [
        { offerId: "deleted", quantity: 1 },
        { offerId: "nm", quantity: 1 },
      ],
      offers,
      products,
    );

    expect(priced.missingCount).toBe(1);
    expect(priced.lines).toHaveLength(1);
  });

  it("returns an empty result for an empty cart", () => {
    expect(priceCart([], offers, products)).toEqual({ lines: [], missingCount: 0, subtotalCents: 0, itemCount: 0 });
  });
});
