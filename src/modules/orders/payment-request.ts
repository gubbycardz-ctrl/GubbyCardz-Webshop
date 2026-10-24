import type { CheckoutRequest } from "@/modules/payment";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { absoluteUrl } from "@/shared/site-url";
import { orderNumber, type Order } from "./order";

// Stripe requires at least 30 minutes; one more keeps a little clock skew from failing the request.
// The stock stays reserved for that long, even if the customer just closes the tab.
export const CHECKOUT_TIMEOUT_MINUTES = 31;
const MS_PER_MINUTE = 60_000;

/** What the payment provider needs to charge exactly the amounts of the order snapshot. */
export function checkoutRequestFor(order: Order, now: Date): CheckoutRequest {
  const number = orderNumber(order.id);
  return {
    orderId: order.id,
    orderNumber: number,
    email: order.email,
    lines: order.lines.map((line) => ({
      name: line.productName,
      description: line.description,
      unitAmountCents: line.unitPriceCents,
      quantity: line.quantity,
    })),
    shipping: {
      label: `Versand nach ${SHIPPING_COUNTRIES[order.shippingAddress.country].label} (versichert)`,
      amountCents: order.shippingCents,
    },
    successUrl: absoluteUrl(`/kasse/danke?bestellung=${number}`),
    cancelUrl: absoluteUrl(`/kasse/abgebrochen?id=${order.id}`),
    expiresAt: new Date(now.getTime() + CHECKOUT_TIMEOUT_MINUTES * MS_PER_MINUTE),
  };
}
