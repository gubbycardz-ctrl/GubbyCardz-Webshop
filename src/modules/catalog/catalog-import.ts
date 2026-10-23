import "server-only";
import { chunks } from "@/shared/chunks";
import { readFirstSheet, SpreadsheetError } from "@/shared/spreadsheet";
import { CatalogError, MAX_PAGE_SIZE, type CatalogRepository } from "./catalog-repository";
import { getCatalogRepository } from "./default-repository";
import { planImport, productSlugsFor, type ExistingOffer, type ImportContext, type ImportPlan, type ImportRowResult } from "./import-plan";
import { parseImportSheet, type ImportRow } from "./import-rows";

// Product import from Excel: reads the file, loads what the database knows about its
// SKUs and lets import-plan.ts decide. Preview and import run the same steps on the
// same file, so the import writes exactly what the preview showed – re-checked
// against the database as it is at that moment.

export type ImportOptions = { overwriteStock: boolean };

export type ImportReport = {
  ok: true;
  rows: ImportRowResult[];
  hasErrors: boolean;
  ignoredColumns: string[];
  /** Only after an import (not a preview). */
  written?: { products: number; offers: number; failures: string[] };
};

export type ImportOutcome = { ok: false; error: string } | ImportReport;

// Parallel writes per batch: fast enough for a few hundred rows, gentle on Firestore.
const WRITE_BATCH_SIZE = 10;

export async function previewCatalogImport(
  file: Blob,
  options: ImportOptions,
  repository: CatalogRepository = getCatalogRepository(),
): Promise<ImportOutcome> {
  const prepared = await prepare(file, options, repository);
  return prepared.ok ? summarize(prepared) : prepared;
}

export async function runCatalogImport(
  file: Blob,
  options: ImportOptions,
  repository: CatalogRepository = getCatalogRepository(),
): Promise<ImportOutcome> {
  const prepared = await prepare(file, options, repository);
  if (!prepared.ok || prepared.plan.hasErrors) return prepared.ok ? summarize(prepared) : prepared;

  const { plan } = prepared;
  const failures: string[] = [];
  // Products first: offers can only be saved for existing products.
  const products = await writeAll(plan.products, (product) => repository.saveProduct(product), (product) => product.name, failures);
  const offers = await writeAll(
    plan.offers,
    ({ offer, internals }) => repository.saveOffer(offer, internals),
    ({ internals }) => internals.sku ?? "",
    failures,
  );
  return { ...summarize(prepared), written: { products, offers, failures } };
}

type Prepared = { ok: true; plan: ImportPlan; ignoredColumns: string[] };

async function prepare(file: Blob, { overwriteStock }: ImportOptions, repository: CatalogRepository) {
  let sheet;
  try {
    sheet = await readFirstSheet(file);
  } catch (error) {
    if (error instanceof SpreadsheetError) return { ok: false as const, error: error.message };
    throw error;
  }
  const parsed = parseImportSheet(sheet);
  if (!parsed.ok) return parsed;

  const context = await loadContext(parsed.rows, repository);
  const plan = planImport(parsed, context, { overwriteStock, newId: () => crypto.randomUUID(), now: new Date().toISOString() });
  return { ok: true as const, plan, ignoredColumns: parsed.ignoredColumns } satisfies Prepared;
}

function summarize({ plan, ignoredColumns }: Prepared): ImportReport {
  return { ok: true, rows: plan.rows, hasErrors: plan.hasErrors, ignoredColumns };
}

async function loadContext(rows: readonly ImportRow[], repository: CatalogRepository): Promise<ImportContext> {
  const games = await repository.listGames();
  const [cardSets, internalsBySku] = await Promise.all([
    Promise.all(games.map((game) => repository.listCardSets(game.id))).then((sets) => sets.flat()),
    inBatches(rows.map((row) => row.sku), (skus) => repository.getOfferInternalsBySkus(skus)).then(
      (maps) => new Map(maps.flatMap((map) => [...map])),
    ),
  ]);

  const offers = (await inBatches([...internalsBySku.values()].map(({ offerId }) => offerId), (ids) => repository.getOffersByIds(ids))).flat();
  const productIds = [...new Set(offers.map((offer) => offer.productId))];
  const products = new Map((await inBatches(productIds, (ids) => repository.getProductsByIds(ids))).flat().map((product) => [product.id, product]));
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));

  const existingBySku = new Map<string, ExistingOffer>();
  for (const [sku, { offerId, internals }] of internalsBySku) {
    const offer = offersById.get(offerId);
    const product = offer && products.get(offer.productId);
    if (offer && product) existingBySku.set(sku, { offer, internals, product });
  }

  const slugs = productSlugsFor(rows, existingBySku);
  const bySlug = (await inBatches(slugs, (part) => Promise.all(part.map((slug) => repository.getProductBySlug(slug))))).flat();
  const productsBySlug = new Map(bySlug.filter((product) => product !== null).map((product) => [product.slug, product]));

  return { games, cardSets, existingBySku, productsBySlug };
}

/** Repository reads take at most MAX_PAGE_SIZE ids at once. */
async function inBatches<T, R>(items: readonly T[], load: (batch: T[]) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const batch of chunks(items, MAX_PAGE_SIZE)) results.push(await load(batch));
  return results;
}

/** Writes all items, collecting catalog errors (e.g. a SKU taken in the meantime) instead of stopping halfway. */
async function writeAll<T>(
  items: readonly T[],
  write: (item: T) => Promise<void>,
  label: (item: T) => string,
  failures: string[],
): Promise<number> {
  let written = 0;
  for (const batch of chunks(items, WRITE_BATCH_SIZE)) {
    const results = await Promise.allSettled(batch.map(write));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") written += 1;
      else if (result.reason instanceof CatalogError) failures.push(`${label(batch[index])}: ${result.reason.message}`);
      else throw result.reason;
    });
  }
  return written;
}
