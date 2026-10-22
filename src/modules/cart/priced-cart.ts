import type { Offer, Product } from "@/modules/catalog";
import type { Cart } from "./cart";

export type PricedCartLine = {
  offer: Offer;
  product: Product;
  /** What we can actually sell right now (never more than in stock). */
  quantity: number;
  lineTotalCents: number;
  /** "reduced": less in stock than requested. "sold-out": nothing left. */
  issue?: "reduced" | "sold-out";
};

export type PricedCart = {
  lines: PricedCartLine[];
  /** Cart entries whose offer no longer exists at all. */
  missingCount: number;
  subtotalCents: number;
  itemCount: number;
};

/** Combines the cart with current catalog data. All amounts are integer cents. */
export function priceCart(
  cart: Cart,
  offers: ReadonlyMap<string, Offer>,
  products: ReadonlyMap<string, Product>,
): PricedCart {
  const lines: PricedCartLine[] = [];
  let missingCount = 0;

  for (const { offerId, quantity: requested } of cart) {
    const offer = offers.get(offerId);
    const product = offer && products.get(offer.productId);
    if (!offer || !product) {
      missingCount++;
      continue;
    }
    const quantity = Math.min(requested, offer.stock);
    const issue = offer.stock === 0 ? "sold-out" : quantity < requested ? "reduced" : undefined;
    lines.push({ offer, product, quantity, lineTotalCents: offer.priceCents * quantity, ...(issue && { issue }) });
  }

  return {
    lines,
    missingCount,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}
