import { optionalText, text, validateForm, type FormFields, type FormResult } from "@/shared/form-validation";
import { parseEuroToCents } from "@/shared/money";
import { cardSetSchema, gameSchema, type CardSet, type Game } from "./game";
import { offerSchema, type Offer } from "./offer";
import { productSchema, type Product, type ProductKind } from "./product";
import { toSlug } from "./slug";

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
};

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

export function parseProductForm(fields: FormFields, id: string): FormResult<Product> {
  const kind = text(fields.kind) as ProductKind;
  const name = text(fields.name);
  const collectorNumber = text(fields.collectorNumber);
  const common = { id, kind, name, gameId: optionalText(fields.gameId), setId: optionalText(fields.setId) };

  // Singles get their number into the URL, because many cards share a name.
  const candidate =
    kind === "single"
      ? { ...common, slug: toSlug(`${name} ${collectorNumber}`), collectorNumber, rarity: text(fields.rarity) }
      : { ...common, slug: toSlug(name) };
  return validateForm(productSchema, candidate, FIELD_LABELS);
}

export function parseOfferForm(fields: FormFields, ids: { id: string; productId: string }): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Preis: bitte als Euro-Betrag eingeben, z. B. 39,99" };

  return validateForm(offerSchema, {
    ...ids,
    type: text(fields.type),
    language: optionalText(fields.language),
    condition: optionalText(fields.condition),
    gradingCompany: optionalText(fields.gradingCompany),
    grade: optionalNumber(fields.grade),
    certNumber: optionalText(fields.certNumber),
    priceCents,
    stock: optionalNumber(fields.stock),
  }, FIELD_LABELS);
}

/** Changes only price and stock of an existing offer – the daily business. */
export function parseOfferUpdateForm(fields: FormFields, offer: Offer): FormResult<Offer> {
  const priceCents = parseEuroToCents(text(fields.price));
  if (priceCents === null) return { ok: false, error: "Preis: bitte als Euro-Betrag eingeben, z. B. 39,99" };
  return validateForm(offerSchema, { ...offer, priceCents, stock: optionalNumber(fields.stock) }, FIELD_LABELS);
}

// German decimal comma, e.g. grade "9,5".
function optionalNumber(value: string | undefined) {
  const normalized = text(value).replace(",", ".");
  return normalized === "" ? undefined : Number(normalized);
}
