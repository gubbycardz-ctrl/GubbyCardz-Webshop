import { z } from "zod";
import { TAX_SCHEMES } from "@/modules/pricing";
import { optionalText, text, validateForm, type FormFields, type FormResult } from "@/shared/form-validation";
import { parseEuroToCents } from "@/shared/money";
import { cardSetSchema, gameSchema, type CardSet, type Game } from "./game";
import { offerSchema, type Offer } from "./offer";
import { offerInternalsSchema, type OfferInternals } from "./offer-internals";
import { productSchema, type Product, type ProductKind } from "./product";
import { toSlug } from "./slug";
import { keysOf } from "./vocabulary";

// Turns raw admin form fields (always strings) into validated catalog entities.
// Errors come back as German text ready to show next to the form.

export type { FormFields, FormResult };

const FIELD_LABELS: Record<string, string> = {
  id: "Name",
  slug: "Name",
  name: "Name",
  gameId: "Spiel",
  setId: "Set",
  code: "Set-Code",
  releaseDate: "Erscheinungsdatum",
  kind: "Produktart",
  collectorNumber: "Nummer",
  rarity: "Seltenheit",
  type: "Angebotsart",
  language: "Sprache",
  condition: "Zustand",
  gradingCompany: "Grading-Firma",
  grade: "Note",
  certNumber: "Zertifikatsnummer",
  priceCents: "Preis",
  stock: "Bestand",
  category: "Kategorie",
  sku: "SKU",
  purchasePriceCents: "EK",
  storageLocation: "Lagerplatz",
  taxScheme: "Steuerart",
  origin: "Herkunft",
};

// Stored data may lack tax scheme, origin and EK (created before these fields existed), but
// everything entered from now on must have them: § 25a UStG needs the EK per item.
const offerFormSchema = offerSchema.and(z.object({ taxScheme: z.enum(keysOf(TAX_SCHEMES)) }));
const offerInternalsFormSchema = offerInternalsSchema.required({ purchasePriceCents: true, origin: true });

export function parseGameForm(fields: FormFields): FormResult<Game> {
  const name = text(fields.name);
  return validateForm(gameSchema, { id: toSlug(name), name }, FIELD_LABELS);
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
  }, FIELD_LABELS);
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
  };

  // Singles get their number into the URL, because many cards share a name.
  const candidate =
    kind === "single"
      ? { ...common, slug: toSlug(`${name} ${collectorNumber}`), collectorNumber, rarity: text(fields.rarity) }
      : { ...common, slug: toSlug(name), ...(kind === "sealed" && { category: text(fields.category) }) };
  return validateForm(productSchema, candidate, FIELD_LABELS);
}

/** Edits an existing product. The kind stays fixed, because its offers were made for that kind. */
export function parseProductUpdateForm(fields: FormFields, product: Product): FormResult<Product> {
  return parseProductForm({ ...fields, kind: product.kind }, { id: product.id, createdAt: product.createdAt });
}

export function parseOfferForm(fields: FormFields, ids: { id: string; productId: string }): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Preis: bitte als Euro-Betrag eingeben, z. B. 39,99" };

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
  }, FIELD_LABELS);
}

/** Changes only price, stock and tax scheme of an existing offer – the daily business. */
export function parseOfferUpdateForm(fields: FormFields, offer: Offer): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Preis: bitte als Euro-Betrag eingeben, z. B. 39,99" };
  return validateForm(
    offerFormSchema,
    { ...offer, priceCents, stock: optionalNumber(fields.stock), taxScheme: optionalText(fields.taxScheme) },
    FIELD_LABELS,
  );
}

/** SKU and storage location are optional (often filled in later); EK and origin are required. */
export function parseOfferInternalsForm(fields: FormFields): FormResult<OfferInternals> {
  const purchasePrice = text(fields.purchasePrice);
  const purchasePriceCents = purchasePrice === "" ? undefined : parseEuroToCents(purchasePrice);
  if (purchasePriceCents === null) return { ok: false, error: "EK: bitte als Euro-Betrag eingeben, z. B. 24,50" };

  return validateForm(offerInternalsFormSchema, {
    sku: optionalText(fields.sku)?.toUpperCase(),
    purchasePriceCents,
    origin: optionalText(fields.origin),
    storageLocation: optionalText(fields.storageLocation),
  }, FIELD_LABELS);
}

// German decimal comma, e.g. grade "9,5".
function optionalNumber(value: string | undefined) {
  const normalized = text(value).replace(",", ".");
  return normalized === "" ? undefined : Number(normalized);
}
