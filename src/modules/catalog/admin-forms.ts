import { z } from "zod";
import { TAX_SCHEMES } from "@/modules/pricing";
import { optionalText, text, validateForm, type FormFields, type FormResult } from "@/shared/form-validation";
import { parseEuroToCents } from "@/shared/money";
import { cardSetSchema, gameSchema, type CardSet, type Game } from "./game";
import { isOfferTypeAllowedFor, offerSchema, type Offer } from "./offer";
import { offerInternalsSchema, type OfferInternals } from "./offer-internals";
import { productSchema, productSlug, type Product, type ProductKind } from "./product";
import { toSlug } from "./slug";
import { keysOf } from "./vocabulary";

// Turns raw admin form fields (always strings) into validated catalog entities.
// Errors come back as English text ready to show next to the form.

export type { FormFields, FormResult };

export const FIELD_LABELS: Record<string, string> = {
  id: "Name",
  slug: "Name",
  name: "Name",
  gameId: "TCG",
  setId: "Set",
  code: "Set code",
  releaseDate: "Release date",
  preReleaseDate: "Pre-release date",
  nameEn: "English name",
  nameDe: "German name",
  nameJa: "Japanese name",
  era: "Era",
  setType: "Set type",
  status: "Status",
  kind: "Product type",
  hidden: "Visibility",
  collectorNumber: "Number",
  rarity: "Rarity",
  type: "Offer type",
  language: "Language",
  condition: "Condition",
  gradingCompany: "Grading company",
  grade: "Grade",
  certNumber: "Certificate number",
  priceCents: "Price",
  stock: "Stock",
  category: "Category",
  sku: "SKU",
  purchasePriceCents: "Purchase price",
  storageLocation: "Storage location",
  taxScheme: "Tax scheme",
  origin: "Origin",
};

// Stored data may lack tax scheme, origin and EK (created before these fields existed), but
// everything entered from now on must have them: § 25a UStG needs the EK per item.
const offerFormSchema = offerSchema.and(z.object({ taxScheme: z.enum(keysOf(TAX_SCHEMES)) }));
const offerInternalsFormSchema = offerInternalsSchema.required({ purchasePriceCents: true, origin: true });

export function parseGameForm(fields: FormFields): FormResult<Game> {
  const name = text(fields.name);
  return validateForm(gameSchema, { id: toSlug(name), name }, FIELD_LABELS, "en");
}

export function parseCardSetForm(fields: FormFields): FormResult<CardSet> {
  const gameId = text(fields.gameId);
  const code = text(fields.code);
  return validateForm(cardSetSchema, {
    id: toSlug(`${gameId} ${code}`),
    gameId,
    name: text(fields.name),
    code,
    releaseDate: optionalText(fields.releaseDate),
  }, FIELD_LABELS, "en");
}

/** Renames a TCG. The id stays, because products and sets point at it and the shop address is built from it. */
export function parseGameEditForm(fields: FormFields, game: Game): FormResult<Game> {
  return validateForm(gameSchema, { ...game, name: text(fields.name) }, FIELD_LABELS, "en");
}

/**
 * Corrects a set. Fields left empty are removed again. An edited set is the admin's from now on: it loses its
 * `source`, so the catalog sync still completes it but never overwrites what was typed here.
 */
export function parseCardSetEditForm(fields: FormFields, set: CardSet): FormResult<CardSet> {
  const edited = {
    ...set,
    name: text(fields.name),
    code: text(fields.code),
    releaseDate: optionalText(fields.releaseDate),
    preReleaseDate: optionalText(fields.preReleaseDate),
    nameEn: optionalText(fields.nameEn),
    nameDe: optionalText(fields.nameDe),
    nameJa: optionalText(fields.nameJa),
    era: optionalText(fields.era),
    setType: optionalText(fields.setType),
    status: optionalText(fields.status),
    source: undefined,
  };
  const present = Object.fromEntries(Object.entries(edited).filter(([, value]) => value !== undefined));
  return validateForm(cardSetSchema, present, FIELD_LABELS, "en");
}

/** `createdAt` is passed in rather than read from the clock, so edits can keep the original value. */
export function parseProductForm(
  fields: FormFields,
  { id, createdAt }: { id: string; createdAt?: string },
): FormResult<Product> {
  const kind = text(fields.kind) as ProductKind;
  const name = text(fields.name);
  const collectorNumber = text(fields.collectorNumber);
  const common = {
    id,
    kind,
    name,
    gameId: optionalText(fields.gameId),
    setId: optionalText(fields.setId),
    createdAt,
    // A ticked checkbox sends a value, an unticked one nothing: forms that do not know the
    // field keep creating visible products, as before.
    ...(text(fields.hidden) && { hidden: true }),
  };

  const slug = productSlug({ kind, name, collectorNumber });
  const candidate =
    kind === "single"
      ? { ...common, slug, collectorNumber, rarity: text(fields.rarity) }
      : { ...common, slug, ...(kind === "sealed" && { category: text(fields.category) }) };
  return validateForm(productSchema, candidate, FIELD_LABELS, "en");
}

export type NewProduct = { product: Product; firstOffer?: { offer: Offer; internals: OfferInternals } };

/**
 * A new product, optionally with its first offer from the same form (checkbox `withOffer`).
 * Problems of both parts are reported together, so the admin fixes them in one go.
 */
export function parseNewProductForm(
  fields: FormFields,
  { productId, offerId, createdAt }: { productId: string; offerId: string; createdAt: string },
): FormResult<NewProduct> {
  const product = parseProductForm(fields, { id: productId, createdAt });
  if (!text(fields.withOffer)) return product.ok ? { ok: true, value: { product: product.value } } : product;

  const offer = parseOfferForm(fields, { id: offerId, productId });
  const internals = parseOfferInternalsForm(fields);
  if (!product.ok || !offer.ok || !internals.ok) {
    const errors = [product, offer, internals].flatMap((result) => (result.ok ? [] : [result.error]));
    return { ok: false, error: errors.join(" · ") };
  }
  if (!isOfferTypeAllowedFor(product.value.kind, offer.value.type)) {
    return { ok: false, error: "Offer type: does not fit the product type" };
  }
  return { ok: true, value: { product: product.value, firstOffer: { offer: offer.value, internals: internals.value } } };
}

/** Edits an existing product. The kind stays fixed, because its offers were made for that kind. */
export function parseProductUpdateForm(fields: FormFields, product: Product): FormResult<Product> {
  return parseProductForm({ ...fields, kind: product.kind }, { id: product.id, createdAt: product.createdAt });
}

export function parseOfferForm(fields: FormFields, ids: { id: string; productId: string }): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Price: enter a euro amount, e.g. 39.99" };

  return validateForm(offerFormSchema, {
    ...ids,
    type: text(fields.type),
    language: optionalText(fields.language),
    condition: optionalText(fields.condition),
    gradingCompany: optionalText(fields.gradingCompany),
    grade: optionalNumber(fields.grade),
    certNumber: optionalText(fields.certNumber),
    priceCents,
    stock: optionalNumber(fields.stock),
    taxScheme: optionalText(fields.taxScheme),
  }, FIELD_LABELS, "en");
}

/** Changes only price, stock and tax scheme of an existing offer – the daily business. */
export function parseOfferUpdateForm(fields: FormFields, offer: Offer): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Price: enter a euro amount, e.g. 39.99" };
  return validateForm(
    offerFormSchema,
    { ...offer, priceCents, stock: optionalNumber(fields.stock), taxScheme: optionalText(fields.taxScheme) },
    FIELD_LABELS,
    "en",
  );
}

/** SKU and storage location are optional (often filled in later); EK and origin are required. */
export function parseOfferInternalsForm(fields: FormFields): FormResult<OfferInternals> {
  const purchasePrice = text(fields.purchasePrice);
  const purchasePriceCents = purchasePrice === "" ? undefined : parseEuroToCents(purchasePrice);
  if (purchasePriceCents === null) return { ok: false, error: "Purchase price: enter a euro amount, e.g. 24.50" };

  return validateForm(offerInternalsFormSchema, {
    sku: optionalText(fields.sku)?.toUpperCase(),
    purchasePriceCents,
    origin: optionalText(fields.origin),
    storageLocation: optionalText(fields.storageLocation),
  }, FIELD_LABELS, "en");
}

// German decimal comma, e.g. grade "9,5".
function optionalNumber(value: string | undefined) {
  const normalized = text(value).replace(",", ".");
  return normalized === "" ? undefined : Number(normalized);
}
