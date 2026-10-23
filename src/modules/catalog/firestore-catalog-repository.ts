import type { CollectionReference, DocumentData, DocumentSnapshot, Firestore, Query } from "firebase-admin/firestore";
import { chunks } from "@/shared/chunks";
import {
  CatalogError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CatalogRepository,
} from "./catalog-repository";
import { cardSetSchema, gameSchema, type CardSet } from "./game";
import { isOfferTypeAllowedFor, offerSchema } from "./offer";
import { offerInternalsSchema } from "./offer-internals";
import { productSchema } from "./product";

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
        const sameSlug = await transaction.get(
          products.where("slug", "==", valid.slug).limit(2),
        );
        if (sameSlug.docs.some((doc) => doc.id !== valid.id)) {
          throw new CatalogError(`Es gibt schon ein Produkt unter /produkte/${valid.slug}`);
        }
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

    async listProducts({ gameId, kind, limit = DEFAULT_PAGE_SIZE }) {
      let query: Query = products;
      if (gameId) query = query.where("gameId", "==", gameId);
      if (kind) query = query.where("kind", "==", kind);
      const snapshot = await query
        .orderBy("name")
        .limit(Math.min(limit, MAX_PAGE_SIZE))
        .get();
      return snapshot.docs.map((doc) => productSchema.parse(doc.data()));
    },

    async listNewestProducts(limit) {
      // Single-field ordering: covered by Firestore's automatic index, no composite index needed.
      const snapshot = await products
        .orderBy("createdAt", "desc")
        .limit(Math.min(limit, MAX_PAGE_SIZE))
        .get();
      return snapshot.docs.map((doc) => productSchema.parse(doc.data()));
    },

    async saveOffer(offer, internals) {
      const valid = offerSchema.parse(offer);
      const validInternals = internals && offerInternalsSchema.parse(internals);
      await db.runTransaction(async (transaction) => {
        const [productDoc, sameSku] = await Promise.all([
          transaction.get(products.doc(valid.productId)),
          validInternals?.sku ? transaction.get(offerInternals.where("sku", "==", validInternals.sku).limit(2)) : null,
        ]);
        if (!productDoc.exists) {
          throw new CatalogError(`Produkt "${valid.productId}" existiert nicht`);
        }
        const product = productSchema.parse(productDoc.data());
        if (!isOfferTypeAllowedFor(product.kind, valid.type)) {
          throw new CatalogError(
            `Angebotsart "${valid.type}" passt nicht zu Produktart "${product.kind}"`,
          );
        }
        if (sameSku?.docs.some((doc) => doc.id !== valid.id)) {
          throw new CatalogError(`Die SKU ${validInternals?.sku} ist schon an ein anderes Angebot vergeben`);
        }
        transaction.set(offers.doc(valid.id), toDocument(valid));
        if (validInternals) {
          transaction.set(offerInternals.doc(valid.id), toDocument({ offerId: valid.id, ...validInternals }));
        }
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

  async function getAllByIds(collection: CollectionReference, ids: readonly string[]): Promise<DocumentSnapshot[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];
    if (uniqueIds.length > MAX_PAGE_SIZE) throw new CatalogError(`Höchstens ${MAX_PAGE_SIZE} Einträge auf einmal`);
    const snapshots = await db.getAll(...uniqueIds.map((id) => collection.doc(id)));
    return snapshots.filter((snapshot) => snapshot.exists);
  }
}

// Firestore rejects `undefined` values; optional fields are simply left out.
function toDocument(entity: object): DocumentData {
  return Object.fromEntries(Object.entries(entity).filter(([, value]) => value !== undefined));
}

function newestFirst(a: CardSet, b: CardSet) {
  return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
}
