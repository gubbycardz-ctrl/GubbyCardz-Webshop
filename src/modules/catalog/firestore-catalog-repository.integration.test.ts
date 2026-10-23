import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CatalogError, type CatalogRepository, type Offer, type OfferInternals, type Product } from ".";
import { createFirestoreCatalogRepository } from "./firestore-catalog-repository";

const PROJECT_ID = "demo-gubbycardz";

const charizard: Product = {
  id: "p-charizard",
  kind: "single",
  name: "Glurak ex",
  slug: "glurak-ex-199-165",
  gameId: "pokemon",
  setId: "sv3pt5",
  collectorNumber: "199/165",
  rarity: "Special Illustration Rare",
};

const display: Product = {
  id: "p-display",
  kind: "sealed",
  name: "Display OP-05",
  slug: "display-op-05",
  gameId: "one-piece",
};

const nearMintOffer: Offer = {
  id: "o-nm",
  productId: charizard.id,
  type: "raw-card",
  language: "de",
  condition: "near-mint",
  priceCents: 3999,
  stock: 1,
};

let app: App;
let db: Firestore;
let repository: CatalogRepository;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firestore emulator not running – use `npm run test:integration`");
  }
  app = initializeApp({ projectId: PROJECT_ID }, "catalog-integration-test");
  db = getFirestore(app);
  repository = createFirestoreCatalogRepository(db);
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
});

afterAll(async () => {
  await deleteApp(app);
});

describe("games and card sets", () => {
  it("lists games alphabetically", async () => {
    await repository.saveGame({ id: "pokemon", name: "Pokémon" });
    await repository.saveGame({ id: "one-piece", name: "One Piece" });

    const games = await repository.listGames();

    expect(games.map((game) => game.id)).toEqual(["one-piece", "pokemon"]);
  });

  it("lists sets of one game, newest first, sets without date last", async () => {
    await repository.saveCardSet({ id: "sv1", gameId: "pokemon", name: "Karmesin & Purpur", code: "SV1", releaseDate: "2023-03-31" });
    await repository.saveCardSet({ id: "promo", gameId: "pokemon", name: "Promos", code: "PR" });
    await repository.saveCardSet({ id: "sv3pt5", gameId: "pokemon", name: "151", code: "MEW", releaseDate: "2023-09-22" });
    await repository.saveCardSet({ id: "op05", gameId: "one-piece", name: "Awakening of the New Era", code: "OP-05" });

    const sets = await repository.listCardSets("pokemon");

    expect(sets.map((set) => set.id)).toEqual(["sv3pt5", "sv1", "promo"]);
  });
});

describe("products", () => {
  it("finds a saved product by slug", async () => {
    await repository.saveProduct(charizard);

    expect(await repository.getProductBySlug(charizard.slug)).toEqual(charizard);
    expect(await repository.getProductBySlug("unknown")).toBeNull();
  });

  it("reads sealed products saved before categories existed, and stores a category", async () => {
    await repository.saveProduct(display);
    expect(await repository.getProductById(display.id)).toEqual(display);

    await repository.saveProduct({ ...display, category: "display" });
    expect(await repository.getProductById(display.id)).toEqual({ ...display, category: "display" });
  });

  it("stores products without optional fields", async () => {
    await repository.saveProduct({ ...display, setId: undefined } as Product);

    expect(await repository.getProductBySlug(display.slug)).toEqual(display);
  });

  it("rejects a second product with the same slug", async () => {
    await repository.saveProduct(charizard);

    await expect(repository.saveProduct({ ...charizard, id: "p-other" })).rejects.toThrow(CatalogError);
  });

  it("allows updating a product while keeping its slug", async () => {
    await repository.saveProduct(charizard);
    await repository.saveProduct({ ...charizard, rarity: "Hyper Rare" });

    expect(await repository.getProductBySlug(charizard.slug)).toMatchObject({ rarity: "Hyper Rare" });
  });

  it("finds a product by id", async () => {
    await repository.saveProduct(charizard);

    expect(await repository.getProductById(charizard.id)).toEqual(charizard);
    expect(await repository.getProductById("missing")).toBeNull();
  });

  it("lists products by kind across games, including those without game", async () => {
    const sleeves: Product = { id: "p-sleeves", kind: "accessory", name: "Sleeves", slug: "sleeves" };
    const playmat: Product = { id: "p-mat", kind: "accessory", name: "Playmat Pikachu", slug: "playmat-pikachu", gameId: "pokemon" };
    await repository.saveProduct(sleeves);
    await repository.saveProduct(playmat);
    await repository.saveProduct(charizard);

    const accessories = await repository.listProducts({ kind: "accessory" });

    expect(accessories.map((product) => product.id)).toEqual(["p-mat", "p-sleeves"]);
  });

  it("rejects invalid products before writing", async () => {
    await expect(repository.saveProduct({ ...charizard, slug: "Not A Slug" })).rejects.toThrow();
    expect(await repository.listProducts({ gameId: "pokemon" })).toEqual([]);
  });

  it("lists products of one game by name, honouring the limit", async () => {
    await repository.saveProduct(charizard);
    await repository.saveProduct({ ...charizard, id: "p-bisasam", name: "Bisasam", slug: "bisasam" });
    await repository.saveProduct(display);

    const pokemon = await repository.listProducts({ gameId: "pokemon" });
    const firstOnly = await repository.listProducts({ gameId: "pokemon", limit: 1 });

    expect(pokemon.map((product) => product.name)).toEqual(["Bisasam", "Glurak ex"]);
    expect(firstOnly).toHaveLength(1);
  });

  it("lists the newest products first, leaving out those without creation date", async () => {
    await repository.saveProduct({ ...charizard, createdAt: "2026-10-01T10:00:00.000Z" });
    await repository.saveProduct({ ...display, createdAt: "2026-10-20T10:00:00.000Z" });
    await repository.saveProduct({ id: "p-sleeves", kind: "accessory", name: "Sleeves", slug: "sleeves" });

    const newest = await repository.listNewestProducts(10);
    const newestOnly = await repository.listNewestProducts(1);

    expect(newest.map((product) => product.id)).toEqual(["p-display", "p-charizard"]);
    expect(newestOnly.map((product) => product.id)).toEqual(["p-display"]);
  });
});

describe("offers", () => {
  beforeEach(async () => {
    await repository.saveProduct(charizard);
    await repository.saveProduct(display);
  });

  it("lists offers of a product, cheapest first", async () => {
    await repository.saveOffer(nearMintOffer);
    await repository.saveOffer({ ...nearMintOffer, id: "o-lp", condition: "light-played", priceCents: 2500 });

    const offers = await repository.listOffers(charizard.id);

    expect(offers.map((offer) => offer.id)).toEqual(["o-lp", "o-nm"]);
  });

  it("loads offers and products by id, skipping unknown and duplicate ids", async () => {
    await repository.saveOffer(nearMintOffer);

    const offers = await repository.getOffersByIds([nearMintOffer.id, "missing", nearMintOffer.id]);
    const products = await repository.getProductsByIds([charizard.id, display.id, "missing"]);

    expect(offers).toEqual([nearMintOffer]);
    expect(products.map((product) => product.id).sort()).toEqual([charizard.id, display.id].sort());
    expect(await repository.getOffersByIds([])).toEqual([]);
  });

  it("refuses unbounded id lookups", async () => {
    const tooMany = Array.from({ length: 101 }, (_, index) => `o${index}`);
    await expect(repository.getOffersByIds(tooMany)).rejects.toThrow(CatalogError);
  });

  it("deletes a single offer together with its internals", async () => {
    await repository.saveOffer(nearMintOffer, { sku: "PKM-1" });
    await repository.deleteOffer(nearMintOffer.id);
    expect(await repository.listOffers(charizard.id)).toEqual([]);
    expect(await repository.getOfferInternals([nearMintOffer.id])).toEqual(new Map());
  });

  it("rejects offers for unknown products", async () => {
    await expect(repository.saveOffer({ ...nearMintOffer, productId: "missing" })).rejects.toThrow(CatalogError);
  });

  it("stores internals apart from the offer, so shop reads never contain them", async () => {
    const offer: Offer = { ...nearMintOffer, taxScheme: "margin" };
    const internals: OfferInternals = { sku: "PKM-MEW-199-DE", purchasePriceCents: 2450, origin: "private", storageLocation: "Regal A3" };
    await repository.saveOffer(offer, internals);

    expect(await repository.getOffersByIds([offer.id])).toEqual([offer]);
    expect(await repository.listOffers(charizard.id)).toEqual([offer]);
    expect(await repository.getOfferInternals([offer.id, "missing"])).toEqual(new Map([[offer.id, internals]]));
  });

  it("keeps internals when an offer is saved without them, and clears fields left empty", async () => {
    await repository.saveOffer(nearMintOffer, { sku: "PKM-1", storageLocation: "Regal A3" });
    await repository.saveOffer({ ...nearMintOffer, stock: 0 });
    expect(await repository.getOfferInternals([nearMintOffer.id])).toEqual(new Map([[nearMintOffer.id, { sku: "PKM-1", storageLocation: "Regal A3" }]]));

    await repository.saveOffer(nearMintOffer, { sku: "PKM-1" });
    expect(await repository.getOfferInternals([nearMintOffer.id])).toEqual(new Map([[nearMintOffer.id, { sku: "PKM-1" }]]));
  });

  it("rejects a SKU that another offer already uses, without writing anything", async () => {
    await repository.saveOffer(nearMintOffer, { sku: "PKM-1" });
    await repository.saveOffer(nearMintOffer, { sku: "PKM-1", storageLocation: "Regal B1" });

    const lightPlayed: Offer = { ...nearMintOffer, id: "o-lp", condition: "light-played" };
    await expect(repository.saveOffer(lightPlayed, { sku: "PKM-1" })).rejects.toThrow(CatalogError);
    expect(await repository.getOffersByIds([lightPlayed.id])).toEqual([]);
  });

  it("rejects offers that do not fit the product kind", async () => {
    const gradedDisplay: Offer = {
      id: "o-bad",
      productId: display.id,
      type: "graded-card",
      language: "ja",
      gradingCompany: "psa",
      grade: 10,
      certNumber: "123",
      priceCents: 10000,
      stock: 1,
    };

    await expect(repository.saveOffer(gradedDisplay)).rejects.toThrow(CatalogError);
    expect(await repository.listOffers(display.id)).toEqual([]);
  });
});

describe("deleting", () => {
  beforeEach(async () => {
    await repository.saveGame({ id: "pokemon", name: "Pokémon" });
    await repository.saveCardSet({ id: "sv3pt5", gameId: "pokemon", name: "151", code: "MEW" });
    await repository.saveProduct(charizard);
    await repository.saveOffer(nearMintOffer, { sku: "PKM-1" });
    await repository.saveOffer({ ...nearMintOffer, id: "o-lp", condition: "light-played" });
  });

  it("deletes a product together with its offers and their internals", async () => {
    await repository.deleteProduct(charizard.id);

    expect(await repository.getProductById(charizard.id)).toBeNull();
    expect(await repository.getOffersByIds([nearMintOffer.id, "o-lp"])).toEqual([]);
    expect(await repository.getOfferInternals([nearMintOffer.id])).toEqual(new Map());
  });

  it("keeps a set while products still belong to it", async () => {
    await expect(repository.deleteCardSet("sv3pt5")).rejects.toThrow(CatalogError);
    expect(await repository.listCardSets("pokemon")).toHaveLength(1);

    await repository.deleteProduct(charizard.id);
    await repository.deleteCardSet("sv3pt5");
    expect(await repository.listCardSets("pokemon")).toEqual([]);
  });

  it("keeps a game while it still has sets or products", async () => {
    await expect(repository.deleteGame("pokemon")).rejects.toThrow(CatalogError);

    await repository.deleteProduct(charizard.id);
    await expect(repository.deleteGame("pokemon")).rejects.toThrow(CatalogError);

    await repository.deleteCardSet("sv3pt5");
    await repository.deleteGame("pokemon");
    expect(await repository.listGames()).toEqual([]);
  });

  it("treats deleting something that is already gone as done", async () => {
    await repository.deleteOffer("missing");
    await repository.deleteProduct("missing");
    await repository.deleteCardSet("missing");
    await repository.deleteGame("missing");
  });
});
