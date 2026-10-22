import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_QUANTITY_PER_LINE,
  itemCount,
  parseCart,
  quantityOf,
  serializeCart,
  setQuantity,
  type Cart,
} from "./cart";

const cart: Cart = [
  { offerId: "glurak-de-nm", quantity: 2 },
  { offerId: "6b0c7d2e-fda5-4d00-b63d-3fbba83c93be", quantity: 1 },
];

describe("cookie format", () => {
  it("round-trips a cart", () => {
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("stays below the cookie size limit even when full", () => {
    const full = Array.from({ length: MAX_CART_LINES }, () => ({
      offerId: crypto.randomUUID(),
      quantity: MAX_QUANTITY_PER_LINE,
    }));
    expect(encodeURIComponent(serializeCart(full)).length).toBeLessThan(3000);
  });

  it("treats a missing or empty cookie as an empty cart", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart("")).toEqual([]);
  });

  it("drops tampered entries but keeps valid ones", () => {
    expect(parseCart("ok.2~<script>.1~bad.-3~bad.1.5~noqty~also-ok.abc~fine.1")).toEqual([
      { offerId: "ok", quantity: 2 },
      { offerId: "fine", quantity: 1 },
    ]);
  });

  it("merges duplicates and caps quantities", () => {
    expect(parseCart("a.60~a.60")).toEqual([{ offerId: "a", quantity: MAX_QUANTITY_PER_LINE }]);
  });

  it("ignores lines beyond the maximum", () => {
    const tooMany = Array.from({ length: MAX_CART_LINES + 5 }, (_, index) => `o${index}.1`).join("~");
    expect(parseCart(tooMany)).toHaveLength(MAX_CART_LINES);
  });
});

describe("setQuantity", () => {
  it("adds, changes and removes lines", () => {
    const added = setQuantity([], "a", 1);
    expect(added).toEqual({ ok: true, cart: [{ offerId: "a", quantity: 1 }] });
    const changed = setQuantity(added.ok ? added.cart : [], "a", 3);
    expect(changed).toEqual({ ok: true, cart: [{ offerId: "a", quantity: 3 }] });
    expect(setQuantity(changed.ok ? changed.cart : [], "a", 0)).toEqual({ ok: true, cart: [] });
  });

  it("keeps the order of existing lines", () => {
    const result = setQuantity(cart, "glurak-de-nm", 5);
    expect(result.ok && result.cart.map((line) => line.offerId)).toEqual(cart.map((line) => line.offerId));
  });

  it("refuses new lines when the cart is full, but still allows changes", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, index) => ({ offerId: `o${index}`, quantity: 1 }));
    expect(setQuantity(full, "new", 1)).toEqual({ ok: false, reason: "cart-full" });
    expect(setQuantity(full, "o1", 2).ok).toBe(true);
  });

  it("caps and truncates odd quantities", () => {
    expect(setQuantity([], "a", 1000)).toEqual({ ok: true, cart: [{ offerId: "a", quantity: MAX_QUANTITY_PER_LINE }] });
    expect(setQuantity([], "a", 2.7)).toEqual({ ok: true, cart: [{ offerId: "a", quantity: 2 }] });
  });

  it("treats negative quantities as removal", () => {
    const result = setQuantity(cart, "glurak-de-nm", -1);
    expect(result.ok && quantityOf(result.cart, "glurak-de-nm")).toBe(0);
  });
});

describe("itemCount", () => {
  it("sums all quantities", () => {
    expect(itemCount(cart)).toBe(3);
    expect(itemCount([])).toBe(0);
  });
});
