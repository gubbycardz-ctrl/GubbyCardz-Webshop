import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getCatalogRepository } from "./default-repository";
import { pickRecommendations } from "./recommendations";

// Read-side for the shop pages. Cached for minutes so repeated visits (and bots)
// do not turn into Firestore reads. Stock shown here may lag slightly; checkout
// re-checks stock in a transaction.
export const CATALOG_CACHE_TAG = "catalog";

const NEWEST_PRODUCTS_COUNT = 8;

const repository = getCatalogRepository;

export async function getGames() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  return repository().listGames();
}

export async function getGame(gameId: string) {
  const games = await getGames();
  return games.find((game) => game.id === gameId) ?? null;
}

export async function getCardSet(gameId: string, setId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  const sets = await repository().listCardSets(gameId);
  return sets.find((set) => set.id === setId) ?? null;
}

export async function getProductsOfGame(gameId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  return repository().listProducts({ gameId });
}

export async function getAccessories() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  return repository().listProducts({ kind: "accessory" });
}

export async function getNewestProducts() {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  return repository().listNewestProducts(NEWEST_PRODUCTS_COUNT);
}

const RECOMMENDATION_COUNT = 4;

/** Newest products that are in stock, apart from the given ones (e.g. what was just ordered). */
export async function getRecommendedProducts(excludedProductIds: readonly string[]) {
  const candidates = await getNewestProducts();
  // Both reads are cached, so checking stock per candidate costs no extra database reads.
  const offers = await Promise.all(candidates.map((product) => getAvailableOffers(product.id)));
  const inStock = new Set(candidates.filter((_, index) => offers[index].length > 0).map((product) => product.id));
  return pickRecommendations(candidates, {
    excludedProductIds: new Set(excludedProductIds),
    isAvailable: (productId) => inStock.has(productId),
    limit: RECOMMENDATION_COUNT,
  });
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  return repository().getProductBySlug(slug);
}

export async function getAvailableOffers(productId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_CACHE_TAG);
  const offers = await repository().listOffers(productId);
  return offers.filter((offer) => offer.stock > 0);
}
