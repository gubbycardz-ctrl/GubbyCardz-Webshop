import type { Product } from "./product";

/**
 * Picks products to suggest, e.g. after an order: in the given order (newest first),
 * only what can be bought right now, never what the customer already has in hand.
 */
export function pickRecommendations(
  candidates: readonly Product[],
  { excludedProductIds, isAvailable, limit }: { excludedProductIds: ReadonlySet<string>; isAvailable: (productId: string) => boolean; limit: number },
): Product[] {
  return candidates.filter((product) => !excludedProductIds.has(product.id) && isAvailable(product.id)).slice(0, limit);
}
