import type { CollectionReference, DocumentData, DocumentSnapshot, Firestore, Query, Transaction } from "firebase-admin/firestore";
import { chunks } from "@/shared/chunks";
import {
  CatalogError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CatalogRepository,
} from "./catalog-repository";
import { cardSetSchema, gameSchema, type CardSet } from "./game";
import { isOfferTypeAllowedFor, offerSchema, type Offer } from "./offer";
import { offerInternalsSchema, type OfferInternals } from "./offer-internals";
import { isShopVisible, productSchema, type Product } from "./product";

export const CATALOG_COLLECTIONS = {
  games: "games",
  cardSets: "cardSets",
  products: "products",
  offers: "offers",
  // Same document id as the offer. Admin only, see offer-internals.ts.
  offerInternals: "offerInternals",
} as const;

// Upper bounds for lists that are not paginated, so a list can never grow unbounded.
const MAX_GAMES = 50;
const MAX_CARD_SETS_PER_GAME = 500;
// Hidden products cannot be filtered in the query ("absent = visible" has no Firestore equivalent),
// so lists read on until enough visible ones are found – at most this many pages of MAX_PAGE_SIZE.
const MAX_SCAN_PAGES = 5;
// Firestore allows at most 30 values in an "in" filter.
const MAX_IN_FILTER_VALUES = 30;

export function createFirestoreCatalogRepository(db: Firestore): CatalogRepository {
  const games = db.collection(CATALOG_COLLECTIONS.games);
  const cardSets = db.collection(CATALOG_COLLECTIONS.cardSets);
  const products = db.collection(CATALOG_COLLECTIONS.products);
  const offers = db.collection(CATALOG_COLLECTIONS.offers);
  const offerInternals = db.collection(CATALOG_COLLECTIONS.offerInternals);

  return {
    async saveGame(game) {
      const valid = gameSchema.parse(game);
      await games.doc(valid.id).set(toDocument(valid));
    },

    async listGames() {
      const snapshot = await games.orderBy("name").limit(MAX_GAMES).get();
      return snapshot.docs.map((doc) => gameSchema.parse(doc.data()));
    },

    async saveCardSet(cardSet) {
      const valid = cardSetSchema.parse(cardSet);
      await cardSets.doc(valid.id).set(toDocument(valid));
    },

    async listCardSets(gameId) {
      const snapshot = await cardSets
        .where("gameId", "==", gameId)
        .limit(MAX_CARD_SETS_PER_GAME)
        .get();
      // Sorted in memory: Firestore's orderBy would silently drop sets without releaseDate.
      return snapshot.docs.map((doc) => cardSetSchema.parse(doc.data())).sort(newestFirst);
    },

    async saveProduct(product) {
      const valid = productSchema.parse(product);
      await db.runTransaction(async (transaction) => {
        await assertSlugIsFree(transaction, valid);
        transaction.set(products.doc(valid.id), toDocument(valid));
      });
    },

    async getProductBySlug(slug) {
      const snapshot = await products.where("slug", "==", slug).limit(1).get();
      const doc = snapshot.docs[0];
      return doc ? productSchema.parse(doc.data()) : null;
    },

    async getProductById(id) {
      const doc = await products.doc(id).get();
      return doc.exists ? productSchema.parse(doc.data()) : null;
    },

    async listProducts({ gameId, kind, limit = DEFAULT_PAGE_SIZE, includeHidden = false }) {
      let query: Query = products;
      if (gameId) query = query.where("gameId", "==", gameId);
      if (kind) query = query.where("kind", "==", kind);
      return readProducts(query.orderBy("name"), Math.min(limit, MAX_PAGE_SIZE), includeHidden);
    },

    async listNewestProducts(limit) {
      // Single-field ordering: covered by Firestore's automatic index, no composite index needed.
      return readProducts(products.orderBy("createdAt", "desc"), Math.min(limit, MAX_PAGE_SIZE), false);
    },

    async saveOffer(offer, internals) {
      const valid = offerSchema.parse(offer);
      const validInternals = internals && offerInternalsSchema.parse(internals);
      await db.runTransaction(async (transaction) => {
        const [productDoc] = await Promise.all([
          transaction.get(products.doc(valid.productId)),
          assertSkuIsFree(transaction, valid, validInternals),
        ]);
        if (!productDoc.exists) {
          throw new CatalogError(`Produkt "${valid.productId}" existiert nicht`);
        }
        assertOfferFits(productSchema.parse(productDoc.data()), valid);
        writeOffer(transaction, valid, validInternals);
      });
    },

    async saveProductWithOffer(product, offer, internals) {
      const validProduct = productSchema.parse(product);
      const validOffer = offerSchema.parse(offer);
      const validInternals = internals && offerInternalsSchema.parse(internals);
      if (validOffer.productId !== validProduct.id) {
        throw new CatalogError("Das Angebot gehört zu einem anderen Produkt");
      }
      assertOfferFits(validProduct, validOffer);
      await db.runTransaction(async (transaction) => {
        await Promise.all([
          assertSlugIsFree(transaction, validProduct),
          assertSkuIsFree(transaction, validOffer, validInternals),
        ]);
        transaction.set(products.doc(validProduct.id), toDocument(validProduct));
        writeOffer(transaction, validOffer, validInternals);
      });
    },

    async listOffers(productId) {
      const snapshot = await offers
        .where("productId", "==", productId)
        .limit(MAX_PAGE_SIZE)
        .get();
      return snapshot.docs
        .map((doc) => offerSchema.parse(doc.data()))
        .sort((a, b) => a.priceCents - b.priceCents);
    },

    async getOffersByIds(ids) {
      const snapshots = await getAllByIds(offers, ids);
      return snapshots.map((snapshot) => offerSchema.parse(snapshot.data()));
    },

    async getOfferInternals(offerIds) {
      const snapshots = await getAllByIds(offerInternals, offerIds);
      return new Map(snapshots.map((snapshot) => [snapshot.id, offerInternalsSchema.parse(snapshot.data())]));
    },

    async getOfferInternalsBySkus(skus) {
      const uniqueSkus = [...new Set(skus)];
      if (uniqueSkus.length > MAX_PAGE_SIZE) throw new CatalogError(`Höchstens ${MAX_PAGE_SIZE} Einträge auf einmal`);
      const snapshots = await Promise.all(
        chunks(uniqueSkus, MAX_IN_FILTER_VALUES).map((part) => offerInternals.where("sku", "in", part).limit(part.length).get()),
      );
      return new Map(
        snapshots
          .flatMap((snapshot) => snapshot.docs)
          .map((doc) => [String(doc.get("sku")), { offerId: doc.id, internals: offerInternalsSchema.parse(doc.data()) }]),
      );
    },

    async getProductsByIds(ids) {
      const snapshots = await getAllByIds(products, ids);
      return snapshots.map((snapshot) => productSchema.parse(snapshot.data()));
    },

    async deleteGame(id) {
      await db.runTransaction(async (transaction) => {
        const [sets, gameProducts] = await Promise.all([
          transaction.get(cardSets.where("gameId", "==", id).limit(1)),
          transaction.get(products.where("gameId", "==", id).limit(1)),
        ]);
        if (!sets.empty || !gameProducts.empty) {
          throw new CatalogError("Das Spiel hat noch Sets oder Produkte – bitte zuerst diese löschen.");
        }
        transaction.delete(games.doc(id));
      });
    },

    async deleteCardSet(id) {
      await db.runTransaction(async (transaction) => {
        const setProducts = await transaction.get(products.where("setId", "==", id).limit(1));
        if (!setProducts.empty) {
          throw new CatalogError("Im Set sind noch Produkte – bitte zuerst diese löschen.");
        }
        transaction.delete(cardSets.doc(id));
      });
    },

    async deleteProduct(id) {
      await db.runTransaction(async (transaction) => {
        const productOffers = await transaction.get(offers.where("productId", "==", id).limit(MAX_PAGE_SIZE + 1));
        if (productOffers.size > MAX_PAGE_SIZE) {
          throw new CatalogError(`Mehr als ${MAX_PAGE_SIZE} Angebote – bitte zuerst einige Angebote löschen.`);
        }
        productOffers.docs.forEach((offer) => {
          transaction.delete(offer.ref);
          transaction.delete(offerInternals.doc(offer.id));
        });
        transaction.delete(products.doc(id));
      });
    },

    async deleteOffer(id) {
      await db.batch().delete(offers.doc(id)).delete(offerInternals.doc(id)).commit();
    },
  };

  /** Reads an ordered query page by page until `wanted` products qualify (see MAX_SCAN_PAGES). */
  async function readProducts(ordered: Query, wanted: number, includeHidden: boolean): Promise<Product[]> {
    // Nothing is skipped when hidden products are wanted, so no more than needed is read.
    const pageSize = includeHidden ? wanted : MAX_PAGE_SIZE;
    const found: Product[] = [];
    let cursor: DocumentSnapshot | undefined;
    for (let page = 0; page < MAX_SCAN_PAGES && found.length < wanted; page++) {
      const snapshot = await (cursor ? ordered.startAfter(cursor) : ordered).limit(pageSize).get();
      for (const doc of snapshot.docs) {
        const product = productSchema.parse(doc.data());
        if (found.length < wanted && (includeHidden || isShopVisible(product))) found.push(product);
      }
      if (snapshot.size < pageSize) break;
      cursor = snapshot.docs.at(-1);
    }
    return found;
  }

  async function assertSlugIsFree(transaction: Transaction, product: Product) {
    const sameSlug = await transaction.get(products.where("slug", "==", product.slug).limit(2));
    if (sameSlug.docs.some((doc) => doc.id !== product.id)) {
      throw new CatalogError(`Es gibt schon ein Produkt unter /produkte/${product.slug}`);
    }
  }

  async function assertSkuIsFree(transaction: Transaction, offer: Offer, internals?: OfferInternals) {
    if (!internals?.sku) return;
    const sameSku = await transaction.get(offerInternals.where("sku", "==", internals.sku).limit(2));
    if (sameSku.docs.some((doc) => doc.id !== offer.id)) {
      throw new CatalogError(`Die SKU ${internals.sku} ist schon an ein anderes Angebot vergeben`);
    }
  }

  function writeOffer(transaction: Transaction, offer: Offer, internals?: OfferInternals) {
    transaction.set(offers.doc(offer.id), toDocument(offer));
    if (internals) {
      transaction.set(offerInternals.doc(offer.id), toDocument({ offerId: offer.id, ...internals }));
    }
  }

  async function getAllByIds(collection: CollectionReference, ids: readonly string[]): Promise<DocumentSnapshot[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];
    if (uniqueIds.length > MAX_PAGE_SIZE) throw new CatalogError(`Höchstens ${MAX_PAGE_SIZE} Einträge auf einmal`);
    const snapshots = await db.getAll(...uniqueIds.map((id) => collection.doc(id)));
    return snapshots.filter((snapshot) => snapshot.exists);
  }
}

function assertOfferFits(product: Product, offer: Offer) {
  if (!isOfferTypeAllowedFor(product.kind, offer.type)) {
    throw new CatalogError(`Angebotsart "${offer.type}" passt nicht zu Produktart "${product.kind}"`);
  }
}

// Firestore rejects `undefined` values; optional fields are simply left out.
function toDocument(entity: object): DocumentData {
  return Object.fromEntries(Object.entries(entity).filter(([, value]) => value !== undefined));
}

function newestFirst(a: CardSet, b: CardSet) {
  return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
}
