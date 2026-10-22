import type { DocumentData, Firestore, Query } from "firebase-admin/firestore";
import {
  CatalogError,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type CatalogRepository,
} from "./catalog-repository";
import { cardSetSchema, gameSchema, type CardSet } from "./game";
import { isOfferTypeAllowedFor, offerSchema } from "./offer";
import { productSchema } from "./product";

const COLLECTIONS = {
  games: "games",
  cardSets: "cardSets",
  products: "products",
  offers: "offers",
} as const;

// Upper bounds for lists that are not paginated, so a list can never grow unbounded.
const MAX_GAMES = 50;
const MAX_CARD_SETS_PER_GAME = 500;

export function createFirestoreCatalogRepository(db: Firestore): CatalogRepository {
  const games = db.collection(COLLECTIONS.games);
  const cardSets = db.collection(COLLECTIONS.cardSets);
  const products = db.collection(COLLECTIONS.products);
  const offers = db.collection(COLLECTIONS.offers);

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

    async saveOffer(offer) {
      const valid = offerSchema.parse(offer);
      await db.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(products.doc(valid.productId));
        if (!productDoc.exists) {
          throw new CatalogError(`Produkt "${valid.productId}" existiert nicht`);
        }
        const product = productSchema.parse(productDoc.data());
        if (!isOfferTypeAllowedFor(product.kind, valid.type)) {
          throw new CatalogError(
            `Angebotsart "${valid.type}" passt nicht zu Produktart "${product.kind}"`,
          );
        }
        transaction.set(offers.doc(valid.id), toDocument(valid));
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
  };
}

// Firestore rejects `undefined` values; optional fields are simply left out.
function toDocument(entity: object): DocumentData {
  return Object.fromEntries(Object.entries(entity).filter(([, value]) => value !== undefined));
}

function newestFirst(a: CardSet, b: CardSet) {
  return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
}
