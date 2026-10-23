// Server-only entry of the catalog module: keeps firebase-admin out of client bundles.
import "server-only";

export { createFirestoreCatalogRepository } from "./firestore-catalog-repository";
export { getCatalogRepository } from "./default-repository";
export { prepareStockChange, type StockItem, type StockShortage } from "./firestore-stock";
export {
  CATALOG_CACHE_TAG,
  getAccessories,
  getAvailableOffers,
  getCardSet,
  getGame,
  getGames,
  getNewestProducts,
  getProduct,
  getProductsOfGame,
} from "./cached-queries";
