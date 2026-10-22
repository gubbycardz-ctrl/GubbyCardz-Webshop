import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CatalogError, type CatalogRepository, type Offer, type Product } from ".";
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

  it("rejects offers for unknown products", async () => {
    await expect(repository.saveOffer({ ...nearMintOffer, productId: "missing" })).rejects.toThrow(CatalogError);
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
