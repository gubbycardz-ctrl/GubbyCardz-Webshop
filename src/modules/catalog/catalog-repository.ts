import type { CardSet, Game } from "./game";
import type { Offer } from "./offer";
import type { OfferInternals } from "./offer-internals";
import type { Product, ProductKind } from "./product";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Storage-independent contract: business logic depends on this, not on Firestore.
export interface CatalogRepository {
  saveGame(game: Game): Promise<void>;
  listGames(): Promise<Game[]>;

  saveCardSet(cardSet: CardSet): Promise<void>;
  listCardSets(gameId: string): Promise<CardSet[]>;

  /** Fails if another product already uses the slug. */
  saveProduct(product: Product): Promise<void>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductById(id: string): Promise<Product | null>;
  /** Filter by game or by kind (e.g. all accessories, with or without game), sorted by name. */
  listProducts(query: { gameId?: string; kind?: ProductKind; limit?: number }): Promise<Product[]>;

  /**
   * Fails if the product does not exist or does not accept this offer type, or if
   * another offer already uses the SKU. Internals are left unchanged when omitted.
   */
  saveOffer(offer: Offer, internals?: OfferInternals): Promise<void>;
  /** Sorted by price, cheapest first. */
  listOffers(productId: string): Promise<Offer[]>;

  /** Missing ids are left out. At most MAX_PAGE_SIZE ids per call. */
  getOffersByIds(ids: readonly string[]): Promise<Offer[]>;
  /** Admin only – never pass the result to shop pages. Keyed by offer id; offers without internals are left out. At most MAX_PAGE_SIZE ids per call. */
  getOfferInternals(offerIds: readonly string[]): Promise<Map<string, OfferInternals>>;
  /** Missing ids are left out. At most MAX_PAGE_SIZE ids per call. */
  getProductsByIds(ids: readonly string[]): Promise<Product[]>;

  // Deleting never leaves dangling references: blocked while something still depends on the entry.
  // Orders are unaffected, because they keep their own snapshot of names and prices.
  /** Fails while the game still has sets or products. */
  deleteGame(id: string): Promise<void>;
  /** Fails while products still belong to the set. */
  deleteCardSet(id: string): Promise<void>;
  /** Deletes the product together with all its offers (and their internals). */
  deleteProduct(id: string): Promise<void>;
  /** Deletes the offer together with its internals. */
  deleteOffer(id: string): Promise<void>;
}

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}
