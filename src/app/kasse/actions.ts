"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getPricedCart, writeCart } from "@/modules/cart/server";
import { CATALOG_CACHE_TAG } from "@/modules/catalog/server";
import { OrderError, buildOrder, orderNumber, parseCheckoutForm } from "@/modules/orders";
import {
  ORDERING_DISABLED_MESSAGE,
  clearCheckoutCustomer,
  getOrderRepository,
  isOrderingEnabled,
  readCheckoutCustomer,
  writeCheckoutCustomer,
} from "@/modules/orders/server";
import { formFieldsOf, isHoneypotFilled } from "@/shared/form-validation";

export type CheckoutState = { error?: string };

export async function saveCheckoutAddress(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const fields = formFieldsOf(formData);
  if (isHoneypotFilled(fields)) return { error: "Das hat nicht geklappt. Bitte versuche es erneut." };

  const result = parseCheckoutForm(fields);
  if (!result.ok) return { error: result.error };
  await writeCheckoutCustomer(result.value);
  redirect("/kasse/uebersicht");
}

/** `shownTotalCents` is the total the customer saw on the overview when clicking the button. */
export async function placeOrder(shownTotalCents: unknown): Promise<CheckoutState> {
  // Checked here too: the disabled button alone protects nothing.
  if (!isOrderingEnabled()) return { error: ORDERING_DISABLED_MESSAGE };

  const customer = await readCheckoutCustomer();
  if (!customer) redirect("/kasse");

  // Built from fresh prices and stock, never from what the overview page showed.
  const result = buildOrder({ id: crypto.randomUUID(), now: new Date(), customer, cart: await getPricedCart() });
  if (!result.ok) return { error: result.error };
  // The customer must be charged exactly what they saw. A price may have changed meanwhile, and the
  // browser may briefly show an older overview it kept from before (Next.js preserves visited routes).
  if (result.order.totalCents !== shownTotalCents) {
    refresh();
    return { error: "Preise oder Versandkosten haben sich gerade geändert. Bitte prüfe die aktualisierte Übersicht." };
  }
  try {
    await getOrderRepository().placeOrder(result.order);
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }

  await writeCart([]);
  await clearCheckoutCustomer();
  // Product pages show the reserved stock on the next request.
  updateTag(CATALOG_CACHE_TAG);
  redirect(`/kasse/danke?bestellung=${orderNumber(result.order.id)}`);
}
