import "server-only";
import type { CatalogRepository } from "./catalog-repository";
import { getCatalogRepository } from "./default-repository";
import type { Offer } from "./offer";
import { isShopVisible } from "./product";

/**
 * The offers among `offerIds` that customers may buy. Offers of hidden products are left out, just
 * like unknown ids: the cart cookie comes from the browser, so it must never lead to a draft.
 */
export async function getSellableOffers(
  offerIds: readonly string[],
  repository: CatalogRepository = getCatalogRepository(),
): Promise<Offer[]> {
  const offers = await repository.getOffersByIds(offerIds);
  const products = await repository.getProductsByIds(offers.map((offer) => offer.productId));
  const visible = new Set(products.filter(isShopVisible).map((product) => product.id));
  return offers.filter((offer) => visible.has(offer.productId));
}
