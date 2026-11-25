import { validateForm } from "@/shared/form-validation";
import { formatEuro } from "@/shared/money";
import { ADMIN_PURCHASE_ORIGINS, ADMIN_TAX_SCHEMES } from "./admin-labels";
import { FIELD_LABELS } from "./admin-forms";
import type { CardSet, Game } from "./game";
import type { ImportRow, ImportRowError } from "./import-rows";
import { offerSchema, type Offer } from "./offer";
import { offerInternalsSchema, type OfferInternals } from "./offer-internals";
import { productSchema, productSlug, type Product } from "./product";
import { toSlug } from "./slug";

// Decides what an import does, without touching the database: the SKU is the key, so a
// second import of the same file updates instead of duplicating. Rules for known SKUs:
// - price, name and storage location follow the file;
// - EK, origin and tax scheme describe the purchase – they are only filled in, never overwritten;
// - stock only follows the file on request, because orders change it after the file was made;
// - everything else (game, set, kind, language, condition …) is changed in the admin pages.

export type ExistingOffer = { offer: Offer; internals: OfferInternals; product: Product };

/** What the database holds for the rows of one file. */
export type ImportContext = {
  games: readonly Game[];
  cardSets: readonly CardSet[];
  /** Offers whose SKU appears in the file, keyed by SKU. */
  existingBySku: ReadonlyMap<string, ExistingOffer>;
  /** Existing products for the slugs from `productSlugsFor`. */
  productsBySlug: ReadonlyMap<string, Product>;
};

export type ImportOptions = {
  overwriteStock: boolean;
  /** New products are created hidden, to be checked and published in the admin area. Existing ones are never touched. */
  hideNewProducts?: boolean;
  newId: () => string;
  now: string;
};

export type ImportRowStatus = "create" | "update" | "unchanged" | "error";
export type ImportRowResult = { line: number; sku: string; name: string; status: ImportRowStatus; messages: string[] };
export type OfferWrite = { offer: Offer; internals: OfferInternals };

export type ImportPlan = {
  rows: ImportRowResult[];
  hasErrors: boolean;
  /** To be written in this order: products first, then offers. Both empty while any row has an error. */
  products: Product[];
  offers: OfferWrite[];
};

/** The product slugs the planner needs to know about, so the caller can load them beforehand. */
export function productSlugsFor(rows: readonly ImportRow[], existingBySku: ReadonlyMap<string, ExistingOffer>): string[] {
  const slugs = rows.map((row) => {
    const product = existingBySku.get(row.sku)?.product;
    return productSlug(product ? { ...product, name: row.name } : row);
  });
  return [...new Set(slugs)];
}

export function planImport(
  parsed: { rows: readonly ImportRow[]; errors: readonly ImportRowError[] },
  context: ImportContext,
  options: ImportOptions,
): ImportPlan {
  const results: ImportRowResult[] = parsed.errors.map((error) => ({ ...error, status: "error" }));
  const productsToSave = new Map<string, Product>();
  const plannedBySlug = new Map<string, Product>();
  const firstLineOfNewProduct = new Map<string, number>();
  const offersToSave: OfferWrite[] = [];
  const lineOfSku = new Map<string, number>();

  for (const row of parsed.rows) {
    const firstLine = lineOfSku.get(row.sku);
    if (firstLine !== undefined) {
      results.push(failed(row, [`SKU: already used in row ${firstLine}`]));
      continue;
    }
    lineOfSku.set(row.sku, row.line);
    const existing = context.existingBySku.get(row.sku);
    results.push(existing ? planUpdate(row, existing) : planCreate(row));
  }

  results.sort((a, b) => a.line - b.line);
  const hasErrors = results.some((result) => result.status === "error");
  return {
    rows: results,
    hasErrors,
    products: hasErrors ? [] : [...productsToSave.values()],
    offers: hasErrors ? [] : offersToSave,
  };

  function planCreate(row: ImportRow): ImportRowResult {
    const messages = missingPurchaseData(row);
    const place = resolvePlace(row, messages);
    if (messages.length > 0) return failed(row, messages);

    const product = findOrPlanProduct(row, place, messages);
    if (!product) return failed(row, messages);

    const offer = validateForm(
      offerSchema,
      { id: options.newId(), productId: product.id, ...row.variant, priceCents: row.priceCents, stock: row.stock, taxScheme: row.taxScheme },
      FIELD_LABELS,
      "en",
    );
    const internals = validateForm(
      offerInternalsSchema,
      { sku: row.sku, purchasePriceCents: row.purchasePriceCents, origin: row.origin, storageLocation: row.storageLocation },
      FIELD_LABELS,
      "en",
    );
    if (!offer.ok || !internals.ok) return failed(row, [offer, internals].flatMap((result) => (result.ok ? [] : [result.error])));

    offersToSave.push({ offer: offer.value, internals: internals.value });
    return { ...describe(row), status: "create", messages: [productNote(row, product), `Price ${formatEuro(row.priceCents)}`, `Stock ${row.stock}`] };
  }

  function planUpdate(row: ImportRow, existing: ExistingOffer): ImportRowResult {
    const plannedName = productsToSave.get(existing.product.id)?.name;
    if (plannedName !== undefined && plannedName !== row.name) {
      return failed(row, [`Name: the same item is named "${plannedName}" in another row`]);
    }

    const changes: string[] = [];
    if (row.name !== existing.product.name) {
      const renamed = renameProduct(existing.product, row.name);
      if (!renamed.ok) return failed(row, [renamed.error]);
      productsToSave.set(renamed.value.id, renamed.value);
      plannedBySlug.set(renamed.value.slug, renamed.value);
      changes.push(`Name "${existing.product.name}" → "${row.name}"`);
    }

    const { offer, internals } = existing;
    const updatedOffer: Offer = {
      ...offer,
      priceCents: row.priceCents,
      stock: options.overwriteStock && row.stock !== undefined ? row.stock : offer.stock,
      taxScheme: offer.taxScheme ?? row.taxScheme,
    };
    const updatedInternals: OfferInternals = {
      ...internals,
      sku: row.sku,
      purchasePriceCents: internals.purchasePriceCents ?? row.purchasePriceCents,
      origin: internals.origin ?? row.origin,
      storageLocation: row.storageLocation ?? internals.storageLocation,
    };
    const offerChanges = describeChanges(existing, updatedOffer, updatedInternals);
    const notes = keptValueNotes(row, existing, options.overwriteStock);
    if (offerChanges.length > 0) {
      const valid = validateForm(offerSchema, updatedOffer, FIELD_LABELS, "en");
      if (!valid.ok) return failed(row, [valid.error]);
      offersToSave.push({ offer: valid.value, internals: updatedInternals });
    }

    const allChanges = [...changes, ...offerChanges];
    return { ...describe(row), status: allChanges.length > 0 ? "update" : "unchanged", messages: [...allChanges, ...notes] };
  }

  function renameProduct(product: Product, name: string) {
    const renamed = validateForm(productSchema, { ...product, name, slug: productSlug({ ...product, name }) }, FIELD_LABELS, "en");
    if (!renamed.ok) return renamed;
    const owner = ownerOfSlug(renamed.value.slug);
    if (owner && owner.id !== product.id) return { ok: false as const, error: `Name: "${name}" already belongs to another product` };
    return renamed;
  }

  function findOrPlanProduct(row: ImportRow, place: Place, messages: string[]): Product | undefined {
    const slug = productSlug(row);
    const owner = ownerOfSlug(slug);
    if (owner) {
      if (owner.kind === row.kind && owner.gameId === place.gameId) return owner;
      messages.push(`Name: "${row.name}" already belongs to another product (different product type or TCG)`);
      return undefined;
    }

    const candidate = {
      id: options.newId(),
      kind: row.kind,
      name: row.name,
      slug,
      gameId: place.gameId,
      setId: place.setId,
      collectorNumber: row.collectorNumber,
      rarity: row.rarity,
      category: row.category,
      createdAt: options.now,
      ...(options.hideNewProducts && { hidden: true }),
    };
    const product = validateForm(productSchema, candidate, FIELD_LABELS, "en");
    if (!product.ok) {
      messages.push(product.error);
      return undefined;
    }
    productsToSave.set(product.value.id, product.value);
    plannedBySlug.set(slug, product.value);
    firstLineOfNewProduct.set(product.value.id, row.line);
    return product.value;
  }

  function productNote(row: ImportRow, product: Product) {
    const firstLine = firstLineOfNewProduct.get(product.id);
    if (firstLine === undefined) return `Added to existing product "${product.name}"`;
    return firstLine === row.line ? "New product" : `New product, as in row ${firstLine}`;
  }

  function ownerOfSlug(slug: string) {
    return plannedBySlug.get(slug) ?? context.productsBySlug.get(slug);
  }

  function resolvePlace(row: ImportRow, messages: string[]): Place {
    if (!row.gameName) return {};
    const game = context.games.find((candidate) => sameWord(candidate.id, row.gameName) || sameWord(candidate.name, row.gameName));
    if (!game) {
      messages.push(`TCG: "${row.gameName}" does not exist – please add it first under "TCGs & Sets"`);
      return {};
    }
    // Accessories have no set.
    if (!row.setName || row.kind === "accessory") return { gameId: game.id };
    const cardSet = context.cardSets.find(
      (candidate) => candidate.gameId === game.id && (sameWord(candidate.name, row.setName) || sameWord(candidate.code, row.setName)),
    );
    if (!cardSet) messages.push(`Set: "${row.setName}" does not exist for ${game.name} yet – add it under "TCGs & Sets" or load it in "TCG Catalog"`);
    return { gameId: game.id, setId: cardSet?.id };
  }
}

type Place = { gameId?: string; setId?: string };

function missingPurchaseData(row: ImportRow): string[] {
  const missing = [
    row.stock === undefined && "Bestand",
    row.purchasePriceCents === undefined && "EK",
    row.origin === undefined && "Herkunft",
    row.taxScheme === undefined && "Steuerart",
  ].filter((label) => label !== false);
  return missing.map((label) => `${label}: required (new item)`);
}

function describeChanges(existing: ExistingOffer, offer: Offer, internals: OfferInternals): string[] {
  const before = existing.offer;
  const { internals: beforeInternals } = existing;
  const changes: string[] = [];
  if (offer.priceCents !== before.priceCents) changes.push(`Price ${formatEuro(before.priceCents)} → ${formatEuro(offer.priceCents)}`);
  if (offer.stock !== before.stock) changes.push(`Stock ${before.stock} → ${offer.stock}`);
  if (offer.taxScheme !== before.taxScheme && offer.taxScheme) changes.push(`Tax scheme added: ${ADMIN_TAX_SCHEMES[offer.taxScheme]}`);
  if (internals.purchasePriceCents !== beforeInternals.purchasePriceCents && internals.purchasePriceCents !== undefined) {
    changes.push(`Purchase price added: ${formatEuro(internals.purchasePriceCents)}`);
  }
  if (internals.origin !== beforeInternals.origin && internals.origin) changes.push(`Origin added: ${ADMIN_PURCHASE_ORIGINS[internals.origin]}`);
  if (internals.storageLocation !== beforeInternals.storageLocation) {
    changes.push(`Storage location "${beforeInternals.storageLocation ?? "–"}" → "${internals.storageLocation}"`);
  }
  return changes;
}

/** Explains file values that were deliberately not taken over, so nothing changes silently. */
function keptValueNotes(row: ImportRow, { offer, internals }: ExistingOffer, overwriteStock: boolean): string[] {
  const notes: string[] = [];
  if (!overwriteStock && row.stock !== undefined && row.stock !== offer.stock) {
    notes.push(`Stock stays ${offer.stock} (file: ${row.stock} – only with "Take stock from the file" ticked)`);
  }
  if (row.purchasePriceCents !== undefined && internals.purchasePriceCents !== undefined && row.purchasePriceCents !== internals.purchasePriceCents) {
    notes.push(`Purchase price stays ${formatEuro(internals.purchasePriceCents)} (never overwritten)`);
  }
  if (row.origin && internals.origin && row.origin !== internals.origin) {
    notes.push(`Origin stays ${ADMIN_PURCHASE_ORIGINS[internals.origin]} (never overwritten)`);
  }
  if (row.taxScheme && offer.taxScheme && row.taxScheme !== offer.taxScheme) {
    notes.push(`Tax scheme stays ${ADMIN_TAX_SCHEMES[offer.taxScheme]} (never overwritten)`);
  }
  return notes;
}

function describe(row: ImportRow) {
  return { line: row.line, sku: row.sku, name: row.name };
}

function failed(row: ImportRow, messages: string[]): ImportRowResult {
  return { ...describe(row), status: "error", messages };
}

function sameWord(a: string, b: string | undefined) {
  return b !== undefined && toSlug(a) === toSlug(b);
}
