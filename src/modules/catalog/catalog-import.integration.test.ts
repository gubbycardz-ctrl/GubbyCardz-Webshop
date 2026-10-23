import { readFile } from "node:fs/promises";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CatalogRepository } from ".";
import { previewCatalogImport, runCatalogImport } from "./catalog-import";
import { createFirestoreCatalogRepository } from "./firestore-catalog-repository";

const PROJECT_ID = "demo-gubbycardz";
// Three rows: a sealed booster bundle, a BGS slab and an accessory (see test/fixtures).
const FIXTURE = new URL("../../../test/fixtures/product-import.xlsx", import.meta.url);
const SKUS = ["TEST-BB-DE-001", "TEST-SLAB-001", "TEST-ACC-001"];
// Three imports with a dozen emulator transactions each take longer than vitest's default 5 s.
const IMPORT_TEST_TIMEOUT_MS = 30_000;

let app: App;
let repository: CatalogRepository;
let file: Blob;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firestore emulator not running – use `npm run test:integration`");
  }
  app = initializeApp({ projectId: PROJECT_ID }, "catalog-import-integration-test");
  repository = createFirestoreCatalogRepository(getFirestore(app));
  file = new Blob([await readFile(FIXTURE)]);
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  await repository.saveGame({ id: "pokemon", name: "Pokémon" });
  await repository.saveCardSet({ id: "pokemon-tst", gameId: "pokemon", name: "Testset", code: "TST" });
});

afterAll(async () => {
  await deleteApp(app);
});

describe("product import", () => {
  it("imports the file and updates instead of duplicating on a second import", async () => {
    const preview = await previewCatalogImport(file, { overwriteStock: false }, repository);
    expect(preview).toMatchObject({ ok: true, hasErrors: false });
    expect(preview.ok && preview.rows.map((row) => row.status)).toEqual(["create", "create", "create"]);
    expect(await repository.getOfferInternalsBySkus(SKUS)).toEqual(new Map());

    const imported = await runCatalogImport(file, { overwriteStock: false }, repository);
    expect(imported).toMatchObject({ ok: true, written: { products: 3, offers: 3, failures: [] } });

    const bySku = await repository.getOfferInternalsBySkus(SKUS);
    expect(bySku.get("TEST-BB-DE-001")?.internals).toEqual({
      sku: "TEST-BB-DE-001",
      purchasePriceCents: 3097,
      origin: "commercial",
      storageLocation: "SEALED-01",
    });
    const [bundle] = await repository.getOffersByIds([bySku.get("TEST-BB-DE-001")!.offerId]);
    expect(bundle).toMatchObject({ type: "sealed", language: "de", priceCents: 5990, stock: 3, taxScheme: "standard" });
    const [slab] = await repository.getOffersByIds([bySku.get("TEST-SLAB-001")!.offerId]);
    expect(slab).toMatchObject({ type: "graded-card", gradingCompany: "bgs", grade: 8.5, certNumber: "0015869070", taxScheme: "margin" });
    expect(await repository.getProductBySlug("testkarte-14-102")).toMatchObject({ kind: "single", setId: "pokemon-tst", rarity: "Holo Rare" });
    expect(await repository.getProductBySlug("testbundle")).toMatchObject({ kind: "sealed", category: "booster-bundle", setId: "pokemon-tst" });

    // One bundle sold in the meantime: a second import must not bring it back.
    await repository.saveOffer({ ...bundle, stock: 2 });
    const again = await runCatalogImport(file, { overwriteStock: false }, repository);
    expect(again).toMatchObject({ ok: true, written: { products: 0, offers: 0, failures: [] } });
    expect(again.ok && again.rows.map((row) => row.status)).toEqual(["unchanged", "unchanged", "unchanged"]);
    expect((await repository.getOffersByIds([bundle.id]))[0].stock).toBe(2);
    expect(await repository.listProducts({ gameId: "pokemon" })).toHaveLength(2);
  }, IMPORT_TEST_TIMEOUT_MS);

  it("writes nothing while a row has an error", async () => {
    await repository.deleteCardSet("pokemon-tst");
    const result = await runCatalogImport(file, { overwriteStock: false }, repository);
    expect(result).toMatchObject({ ok: true, hasErrors: true });
    expect(result.ok && result.written).toBeUndefined();
    expect(await repository.getOfferInternalsBySkus(SKUS)).toEqual(new Map());
  }, IMPORT_TEST_TIMEOUT_MS);
});
