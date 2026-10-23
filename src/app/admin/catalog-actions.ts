"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  CatalogError,
  parseCardSetForm,
  parseGameForm,
  parseOfferForm,
  parseOfferUpdateForm,
  parseProductForm,
  type FormFields,
  type FormResult,
} from "@/modules/catalog";
import { CATALOG_CACHE_TAG, getCatalogRepository } from "@/modules/catalog/server";
import { requireAdmin } from "@/modules/auth/server";

export type FormState = { error?: string; success?: string };

export async function createGame(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  return save(parseGameForm(fieldsOf(formData)), (game) => getCatalogRepository().saveGame(game), "Spiel gespeichert.");
}

export async function createCardSet(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  return save(parseCardSetForm(fieldsOf(formData)), (set) => getCatalogRepository().saveCardSet(set), "Set gespeichert.");
}

export async function createProduct(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseProductForm(fieldsOf(formData), crypto.randomUUID());
  const state = await save(parsed, (product) => getCatalogRepository().saveProduct(product), "");
  // Straight to the new product, where its offers are added.
  if (!state.error && parsed.ok) redirect(`/admin/produkte/${parsed.value.id}`);
  return state;
}

export async function createOffer(productId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId)) return { error: "Produkt nicht gefunden." };
  const parsed = parseOfferForm(fieldsOf(formData), { id: crypto.randomUUID(), productId });
  return save(parsed, (offer) => getCatalogRepository().saveOffer(offer), "Angebot angelegt.");
}

export async function updateOffer(productId: string, offerId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId) || !isId(offerId)) return { error: "Angebot nicht gefunden." };
  const repository = getCatalogRepository();
  const offer = (await repository.listOffers(productId)).find((candidate) => candidate.id === offerId);
  if (!offer) return { error: "Angebot nicht gefunden." };
  return save(parseOfferUpdateForm(fieldsOf(formData), offer), (updated) => repository.saveOffer(updated), "Gespeichert.");
}

async function save<T>(parsed: FormResult<T>, write: (value: T) => Promise<void>, success: string): Promise<FormState> {
  if (!parsed.ok) return { error: parsed.error };
  try {
    await write(parsed.value);
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message };
    throw error;
  }
  afterCatalogChange();
  return { success };
}

export async function deleteGame(gameId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(gameId)) return { error: "Spiel nicht gefunden." };
  return remove(() => getCatalogRepository().deleteGame(gameId));
}

export async function deleteCardSet(setId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(setId)) return { error: "Set nicht gefunden." };
  return remove(() => getCatalogRepository().deleteCardSet(setId));
}

export async function deleteProduct(productId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId)) return { error: "Produkt nicht gefunden." };
  const repository = getCatalogRepository();
  const product = await repository.getProductById(productId);
  const state = await remove(() => repository.deleteProduct(productId));
  // The product page no longer exists, so go back to the list it came from.
  if (!state.error) redirect(`/admin/produkte?filter=${product?.gameId ?? "zubehoer"}`);
  return state;
}

export async function deleteOffer(offerId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(offerId)) return { error: "Angebot nicht gefunden." };
  return remove(() => getCatalogRepository().deleteOffer(offerId));
}

async function remove(operation: () => Promise<void>): Promise<FormState> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message };
    throw error;
  }
  afterCatalogChange();
  return { success: "Gelöscht." };
}

function afterCatalogChange() {
  // Shop pages show the change on the next request, the admin page right away.
  updateTag(CATALOG_CACHE_TAG);
  refresh();
}

// Bound arguments arrive from the browser like any other input, so check them too.
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function fieldsOf(formData: FormData): FormFields {
  const fields: FormFields = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") fields[key] = value;
  }
  return fields;
}
