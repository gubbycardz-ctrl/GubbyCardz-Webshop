// Fills the local Firestore emulator with sample catalog data: `npm run seed`.
// Hard-wired to the emulator so it can never write to production.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.METADATA_SERVER_DETECTION ??= "none";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createFirestoreCatalogRepository } from "../src/modules/catalog/firestore-catalog-repository";

const app = initializeApp({ projectId: "demo-gubbycardz" });
const catalog = createFirestoreCatalogRepository(getFirestore(app));

async function seed() {
  await catalog.saveGame({ id: "pokemon", name: "Pokémon" });
  await catalog.saveGame({ id: "one-piece", name: "One Piece" });

  await catalog.saveCardSet({ id: "sv3pt5", gameId: "pokemon", name: "Karmesin & Purpur – 151", code: "MEW", releaseDate: "2023-09-22" });
  await catalog.saveCardSet({ id: "op05", gameId: "one-piece", name: "Awakening of the New Era", code: "OP-05", releaseDate: "2023-12-08" });

  await catalog.saveProduct({ id: "glurak-ex-199", kind: "single", name: "Glurak ex", slug: "glurak-ex-199-165", gameId: "pokemon", setId: "sv3pt5", collectorNumber: "199/165", rarity: "Special Illustration Rare" });
  await catalog.saveProduct({ id: "bisasam-166", kind: "single", name: "Bisasam", slug: "bisasam-166-165", gameId: "pokemon", setId: "sv3pt5", collectorNumber: "166/165", rarity: "Illustration Rare" });
  await catalog.saveProduct({ id: "mew-151-display", kind: "sealed", category: "booster-bundle", name: "151 Booster Bundle", slug: "151-booster-bundle", gameId: "pokemon", setId: "sv3pt5" });
  await catalog.saveProduct({ id: "mew-151-etb", kind: "sealed", category: "elite-trainer-box", name: "151 Elite Trainer Box", slug: "151-elite-trainer-box", gameId: "pokemon", setId: "sv3pt5" });
  await catalog.saveProduct({ id: "luffy-op05-119", kind: "single", name: "Monkey D. Luffy", slug: "monkey-d-luffy-op05-119", gameId: "one-piece", setId: "op05", collectorNumber: "OP05-119", rarity: "Secret Rare" });
  await catalog.saveProduct({ id: "op05-display", kind: "sealed", category: "display", name: "Display OP-05", slug: "display-op-05", gameId: "one-piece", setId: "op05" });
  await catalog.saveProduct({ id: "sleeves-black", kind: "accessory", name: "Sleeves schwarz (100 Stück)", slug: "sleeves-schwarz-100" });

  await catalog.saveOffer({ id: "glurak-de-nm", productId: "glurak-ex-199", type: "raw-card", language: "de", condition: "near-mint", priceCents: 11999, stock: 2 }, { sku: "PKM-MEW-199-DE-NM", purchasePriceCents: 9000, storageLocation: "Ordner 1 / Seite 3" });
  await catalog.saveOffer({ id: "glurak-en-lp", productId: "glurak-ex-199", type: "raw-card", language: "en", condition: "light-played", priceCents: 8499, stock: 1 });
  await catalog.saveOffer({ id: "glurak-psa10", productId: "glurak-ex-199", type: "graded-card", language: "en", gradingCompany: "psa", grade: 10, certNumber: "81234567", priceCents: 39900, stock: 1 });
  await catalog.saveOffer({ id: "bisasam-sold-out", productId: "bisasam-166", type: "raw-card", language: "de", condition: "near-mint", priceCents: 2499, stock: 0 });
  await catalog.saveOffer({ id: "mew-bundle-de", productId: "mew-151-display", type: "sealed", language: "de", priceCents: 3499, stock: 5 }, { sku: "PKM-MEW-BB-DE", purchasePriceCents: 2450, storageLocation: "Regal A2" });
  await catalog.saveOffer({ id: "mew-etb-en", productId: "mew-151-etb", type: "sealed", language: "en", priceCents: 8999, stock: 2 }, { sku: "PKM-MEW-ETB-EN", purchasePriceCents: 6200, storageLocation: "Regal A1" });
  await catalog.saveOffer({ id: "luffy-ja", productId: "luffy-op05-119", type: "raw-card", language: "ja", condition: "near-mint", priceCents: 15999, stock: 1 });
  await catalog.saveOffer({ id: "luffy-zh", productId: "luffy-op05-119", type: "raw-card", language: "zh-Hans", condition: "excellent", priceCents: 6999, stock: 1 });
  await catalog.saveOffer({ id: "op05-display-ja", productId: "op05-display", type: "sealed", language: "ja", priceCents: 12999, stock: 3 }, { sku: "OP-OP05-DSP-JA", purchasePriceCents: 9500, storageLocation: "Regal B1" });
  await catalog.saveOffer({ id: "sleeves-black", productId: "sleeves-black", type: "accessory", priceCents: 899, stock: 20 });

  console.log("Emulator mit Beispieldaten befüllt.");
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
