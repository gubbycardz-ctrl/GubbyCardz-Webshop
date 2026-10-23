import { describe, expect, it } from "vitest";
import type { PricedCart } from "@/modules/cart";
import type { Offer, Product } from "@/modules/catalog";
import { buildOrder } from "./build-order";
import type { CheckoutCustomer } from "./checkout-form";
import { orderSchema } from "./order";

const product: Product = { id: "p1", kind: "single", name: "Glurak ex", slug: "glurak", gameId: "pokemon", setId: "mew", collectorNumber: "199/165", rarity: "SIR" };
const offer: Offer = { id: "o1", productId: "p1", type: "raw-card", language: "de", condition: "near-mint", priceCents: 11999, stock: 3 };
const customer: CheckoutCustomer = {
  email: "kunde@example.com",
  shippingAddress: { name: "Max", street: "Hauptstraße 1", postalCode: "10115", city: "Berlin", country: "DE" },
};
const cart: PricedCart = {
  lines: [{ offer, product, quantity: 2, lineTotalCents: 23998 }],
  missingCount: 0,
  subtotalCents: 23998,
  itemCount: 2,
};
const now = new Date("2026-10-23T12:00:00Z");

describe("buildOrder", () => {
  it("snapshots names and prices and adds shipping for the country", () => {
    const result = buildOrder({ id: "order-1", now, customer, cart });

    expect(result).toEqual({
      ok: true,
      order: {
        id: "order-1",
        status: "awaiting-payment",
        createdAt: "2026-10-23T12:00:00.000Z",
        email: "kunde@example.com",
        shippingAddress: customer.shippingAddress,
        lines: [{ offerId: "o1", productId: "p1", productName: "Glurak ex", description: "Deutsch · Near Mint (NM)", unitPriceCents: 11999, quantity: 2 }],
        subtotalCents: 23998,
        shippingCents: 769,
        totalCents: 24767,
      },
    });
    expect(result.ok && orderSchema.safeParse(result.order).success).toBe(true);
  });

  it("charges Dutch shipping for Dutch addresses", () => {
    const dutch = { ...customer, shippingAddress: { ...customer.shippingAddress, country: "NL" as const, postalCode: "1012 AB" } };
    const result = buildOrder({ id: "order-2", now, customer: dutch, cart });
    expect(result.ok && result.order.shippingCents).toBe(1699);
  });

  it("refuses an empty cart", () => {
    const empty: PricedCart = { lines: [], missingCount: 0, subtotalCents: 0, itemCount: 0 };
    expect(buildOrder({ id: "x", now, customer, cart: empty })).toEqual({ ok: false, error: "Dein Warenkorb ist leer." });
  });

  it("refuses a cart whose quantities had to be corrected", () => {
    const reduced: PricedCart = { ...cart, lines: [{ ...cart.lines[0], issue: "reduced" }] };
    const missing: PricedCart = { ...cart, missingCount: 1 };
    expect(buildOrder({ id: "x", now, customer, cart: reduced }).ok).toBe(false);
    expect(buildOrder({ id: "x", now, customer, cart: missing }).ok).toBe(false);
  });
});
