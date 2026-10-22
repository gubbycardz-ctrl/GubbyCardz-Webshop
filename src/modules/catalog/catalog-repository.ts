import type { CardSet, Game } from "./game";
import type { Offer } from "./offer";
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

  /** Fails if the product does not exist or does not accept this offer type. */
  saveOffer(offer: Offer): Promise<void>;
  /** Sorted by price, cheapest first. */
  listOffers(productId: string): Promise<Offer[]>;
}

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}
