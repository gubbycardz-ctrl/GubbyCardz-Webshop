// The cart only remembers *which* offers and *how many*. Prices and stock are
// always looked up fresh on the server, so a tampered cart cannot change a price.

// Keeps the cookie well below the browser limit of 4 KB.
export const MAX_CART_LINES = 50;
export const MAX_QUANTITY_PER_LINE = 99;

export type CartLine = { offerId: string; quantity: number };
export type Cart = readonly CartLine[];

const OFFER_ID = /^[A-Za-z0-9_-]{1,128}$/;
// Characters that survive cookie encoding unchanged: "id.qty~id.qty".
const LINE_SEPARATOR = "~";
const QUANTITY_SEPARATOR = ".";

export function isOfferId(value: unknown): value is string {
  return typeof value === "string" && OFFER_ID.test(value);
}

/** Never throws: unreadable or tampered parts of the cookie are simply dropped. */
export function parseCart(value: string | undefined): Cart {
  let cart: Cart = [];
  for (const entry of (value ?? "").split(LINE_SEPARATOR)) {
    const parts = entry.split(QUANTITY_SEPARATOR);
    if (parts.length !== 2) continue;
    const [offerId, quantityText] = parts;
    const quantity = Number(quantityText);
    if (!isOfferId(offerId) || !/^\d+$/.test(quantityText) || quantity < 1) continue;
    const result = setQuantity(cart, offerId, quantityOf(cart, offerId) + quantity);
    if (result.ok) cart = result.cart;
  }
  return cart;
}

export function serializeCart(cart: Cart): string {
  return cart.map((line) => `${line.offerId}${QUANTITY_SEPARATOR}${line.quantity}`).join(LINE_SEPARATOR);
}

export function quantityOf(cart: Cart, offerId: string): number {
  return cart.find((line) => line.offerId === offerId)?.quantity ?? 0;
}

export function itemCount(cart: Cart): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

export type CartUpdate = { ok: true; cart: Cart } | { ok: false; reason: "cart-full" };

/** Sets the quantity of one offer; 0 removes it. Quantities are capped per line. */
export function setQuantity(cart: Cart, offerId: string, quantity: number): CartUpdate {
  const capped = Math.min(Math.max(Math.trunc(quantity), 0), MAX_QUANTITY_PER_LINE);
  const exists = cart.some((line) => line.offerId === offerId);

  if (capped === 0) return { ok: true, cart: cart.filter((line) => line.offerId !== offerId) };
  if (exists) {
    return { ok: true, cart: cart.map((line) => (line.offerId === offerId ? { offerId, quantity: capped } : line)) };
  }
  if (cart.length >= MAX_CART_LINES) return { ok: false, reason: "cart-full" };
  return { ok: true, cart: [...cart, { offerId, quantity: capped }] };
}
