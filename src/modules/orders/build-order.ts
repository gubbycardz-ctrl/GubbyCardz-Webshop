import { describeOffer } from "@/modules/catalog";
import type { PricedCart } from "@/modules/cart";
import { shippingCostCents } from "@/modules/shipping";
import type { CheckoutCustomer } from "./checkout-form";
import type { Order } from "./order";

export type BuildOrderResult = { ok: true; order: Order } | { ok: false; error: string };

/** Turns the freshly priced cart into an order. All amounts are computed here, never in the browser. */
export function buildOrder(input: { id: string; now: Date; customer: CheckoutCustomer; cart: PricedCart }): BuildOrderResult {
  const { cart, customer } = input;

  if (cart.lines.length === 0 && cart.missingCount === 0) {
    return { ok: false, error: "Dein Warenkorb ist leer." };
  }
  // The customer must see the corrected cart before paying for something else than expected.
  if (cart.missingCount > 0 || cart.lines.some((line) => line.issue)) {
    return { ok: false, error: "Einige Artikel sind nicht mehr in der gewünschten Menge verfügbar. Bitte prüfe deinen Warenkorb." };
  }

  const shippingCents = shippingCostCents(customer.shippingAddress.country);
  return {
    ok: true,
    order: {
      id: input.id,
      status: "awaiting-payment",
      createdAt: input.now.toISOString(),
      email: customer.email,
      shippingAddress: customer.shippingAddress,
      lines: cart.lines.map(({ offer, product, quantity }) => ({
        offerId: offer.id,
        productId: product.id,
        productName: product.name,
        description: describeOffer(offer),
        unitPriceCents: offer.priceCents,
        quantity,
      })),
      subtotalCents: cart.subtotalCents,
      shippingCents,
      totalCents: cart.subtotalCents + shippingCents,
    },
  };
}
