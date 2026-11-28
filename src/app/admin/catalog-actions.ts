"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  CatalogError,
  parseCardSetEditForm,
  parseCardSetForm,
  parseGameEditForm,
  parseGameForm,
  parseNewProductForm,
  parseOfferForm,
  parseOfferInternalsForm,
  parseOfferUpdateForm,
  parseProductUpdateForm,
  type FormResult,
} from "@/modules/catalog";
import { CATALOG_CACHE_TAG, getCatalogRepository } from "@/modules/catalog/server";
import { requireAdmin } from "@/modules/auth/server";
import { formFieldsOf } from "@/shared/form-validation";

export type FormState = { error?: string; success?: string };

export async function createGame(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  return save(parseGameForm(formFieldsOf(formData)), (game) => getCatalogRepository().saveGame(game), "TCG saved.");
}

export async function createCardSet(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  return save(parseCardSetForm(formFieldsOf(formData)), (set) => getCatalogRepository().saveCardSet(set), "Set saved.");
}

export async function updateGame(gameId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(gameId)) return { error: "TCG not found." };
  const repository = getCatalogRepository();
  const game = (await repository.listGames()).find((candidate) => candidate.id === gameId);
  if (!game) return { error: "TCG not found." };
  return save(parseGameEditForm(formFieldsOf(formData), game), (updated) => repository.saveGame(updated), "Saved.");
}

export async function updateCardSet(setId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(setId)) return { error: "Set not found." };
  const repository = getCatalogRepository();
  const set = await repository.getCardSet(setId);
  if (!set) return { error: "Set not found." };
  return save(parseCardSetEditForm(formFieldsOf(formData), set), (updated) => repository.saveCardSet(updated), "Saved.");
}

/** Creates the product and, if the form asks for it, its first offer – both or neither. */
export async function createProduct(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseNewProductForm(formFieldsOf(formData), {
    productId: crypto.randomUUID(),
    offerId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  const repository = getCatalogRepository();
  const state = await save(
    parsed,
    ({ product, firstOffer }) =>
      firstOffer
        ? repository.saveProductWithOffer(product, firstOffer.offer, firstOffer.internals)
        : repository.saveProduct(product),
    "",
  );
  // Straight to the new product, where further offers are added.
  if (!state.error && parsed.ok) redirect(`/admin/produkte/${parsed.value.product.id}`);
  return state;
}

export async function updateProduct(productId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId)) return { error: "Product not found." };
  const repository = getCatalogRepository();
  const product = await repository.getProductById(productId);
  if (!product) return { error: "Product not found." };
  return save(parseProductUpdateForm(formFieldsOf(formData), product), (updated) => repository.saveProduct(updated), "Saved.");
}

export async function createOffer(productId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId)) return { error: "Product not found." };
  const fields = formFieldsOf(formData);
  const internals = parseOfferInternalsForm(fields);
  if (!internals.ok) return { error: internals.error };
  const parsed = parseOfferForm(fields, { id: crypto.randomUUID(), productId });
  return save(parsed, (offer) => getCatalogRepository().saveOffer(offer, internals.value), "Offer created.");
}

export async function updateOffer(productId: string, offerId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId) || !isId(offerId)) return { error: "Offer not found." };
  const repository = getCatalogRepository();
  const offer = (await repository.listOffers(productId)).find((candidate) => candidate.id === offerId);
  if (!offer) return { error: "Offer not found." };
  const fields = formFieldsOf(formData);
  const internals = parseOfferInternalsForm(fields);
  if (!internals.ok) return { error: internals.error };
  return save(parseOfferUpdateForm(fields, offer), (updated) => repository.saveOffer(updated, internals.value), "Saved.");
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
  if (!isId(gameId)) return { error: "TCG not found." };
  return remove(() => getCatalogRepository().deleteGame(gameId));
}

export async function deleteCardSet(setId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(setId)) return { error: "Set not found." };
  return remove(() => getCatalogRepository().deleteCardSet(setId));
}

export async function deleteProduct(productId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(productId)) return { error: "Product not found." };
  const repository = getCatalogRepository();
  const product = await repository.getProductById(productId);
  const state = await remove(() => repository.deleteProduct(productId));
  // The product page no longer exists, so go back to the list it came from.
  if (!state.error) redirect(`/admin/produkte?filter=${product?.gameId ?? "zubehoer"}`);
  return state;
}

export async function deleteOffer(offerId: unknown): Promise<FormState> {
  await requireAdmin();
  if (!isId(offerId)) return { error: "Offer not found." };
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
  return { success: "Deleted." };
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
