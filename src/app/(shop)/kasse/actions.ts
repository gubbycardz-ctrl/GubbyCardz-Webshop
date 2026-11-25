"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getPricedCart, writeCart } from "@/modules/cart/server";
import { CATALOG_CACHE_TAG } from "@/modules/catalog/server";
import { OrderError, buildOrder, checkoutRequestFor, parseCheckoutForm, type Order } from "@/modules/orders";
import {
  clearCheckoutCustomer,
  getOrderingAccess,
  getOrderRepository,
  readCheckoutCustomer,
  rememberLastOrder,
  writeCheckoutCustomer,
} from "@/modules/orders/server";
import type { PaymentProvider } from "@/modules/payment";
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
  const access = await getOrderingAccess();
  if (!access.open) return { error: access.reason };

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
  // Product pages show the reserved stock on the next request.
  updateTag(CATALOG_CACHE_TAG);

  const paymentUrl = await startPayment(result.order, access.provider);
  if (!paymentUrl) {
    return { error: "Die Bezahlung konnte gerade nicht gestartet werden. Bitte versuche es gleich noch einmal." };
  }
  // The cart comes back if the customer cancels the payment (see /kasse/abgebrochen).
  await writeCart([]);
  await clearCheckoutCustomer();
  // The thank-you page shows the summary only in this browser.
  await rememberLastOrder(result.order.id);
  redirect(paymentUrl);
}

/** Opens the provider's payment page. Without one the order can never be paid, so its stock goes back at once. */
async function startPayment(order: Order, provider: PaymentProvider): Promise<string | null> {
  const repository = getOrderRepository();
  try {
    const checkout = await provider.createCheckout(checkoutRequestFor(order, new Date()));
    await repository.attachPaymentSession(order.id, checkout.id);
    return checkout.url;
  } catch (error) {
    // Ids and error codes only: provider messages can quote customer data such as the email address.
    console.error(`Payment could not be started for order ${order.id}: ${errorCode(error)}`);
    await repository.cancel(order.id, new Date());
    updateTag(CATALOG_CACHE_TAG);
    return null;
  }
}

function errorCode(error: unknown) {
  if (error instanceof Error) return "code" in error && error.code ? `${error.name} ${String(error.code)}` : error.name;
  return "unknown";
}
