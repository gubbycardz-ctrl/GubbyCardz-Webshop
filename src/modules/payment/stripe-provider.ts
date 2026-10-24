import "server-only";
import Stripe from "stripe";
import { PaymentWebhookError, type PaymentMode, type PaymentProvider } from "./payment-provider";

const CURRENCY = "eur";
const SIGNATURE_HEADER = "stripe-signature";

/** Stripe Checkout behind our PaymentProvider. Payment methods (card, PayPal, Klarna, SEPA …) are chosen in the Stripe dashboard. */
export function createStripePaymentProvider(stripe: Stripe, webhookSecret: string, mode: PaymentMode): PaymentProvider {
  return {
    mode,

    async createCheckout(request) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          locale: "de",
          customer_email: request.email,
          client_reference_id: request.orderId,
          metadata: { orderId: request.orderId, orderNumber: request.orderNumber },
          // Also on the payment itself, so the order can be found from the Stripe dashboard.
          payment_intent_data: { metadata: { orderId: request.orderId, orderNumber: request.orderNumber } },
          line_items: request.lines.map((line) => ({
            quantity: line.quantity,
            price_data: {
              currency: CURRENCY,
              unit_amount: line.unitAmountCents,
              product_data: { name: line.name, ...(line.description && { description: line.description }) },
            },
          })),
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: request.shipping.label,
                fixed_amount: { amount: request.shipping.amountCents, currency: CURRENCY },
              },
            },
          ],
          success_url: request.successUrl,
          cancel_url: request.cancelUrl,
          expires_at: Math.floor(request.expiresAt.getTime() / 1000),
        },
        // A retried request must not open a second checkout for the same order.
        { idempotencyKey: `checkout-${request.orderId}` },
      );
      if (!session.url) throw new Error(`Stripe returned no checkout URL for session ${session.id}`);
      return { id: session.id, url: session.url };
    },

    async expireCheckout(sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
        return true;
      } catch (error) {
        // Stripe refuses to expire a checkout that is already complete or expired.
        if (error instanceof Stripe.errors.StripeInvalidRequestError) return false;
        throw error;
      }
    },

    parseWebhook(payload, headers) {
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(payload, headers.get(SIGNATURE_HEADER) ?? "", webhookSecret);
      } catch {
        throw new PaymentWebhookError("Invalid webhook signature");
      }

      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object;
          // Delayed methods such as SEPA complete the checkout first and are paid days later.
          if (session.payment_status === "unpaid") return null;
          const orderId = orderIdOf(session);
          return orderId ? { type: "paid", orderId, sessionId: session.id, amountCents: session.amount_total ?? 0 } : null;
        }
        case "checkout.session.expired":
        case "checkout.session.async_payment_failed": {
          const session = event.data.object;
          const orderId = orderIdOf(session);
          return orderId ? { type: "failed", orderId, sessionId: session.id } : null;
        }
        default:
          return null;
      }
    },
  };
}

/** Checkouts not started by this shop (e.g. payment links made by hand) carry no order id. */
function orderIdOf(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.orderId ?? null;
}

/** Live keys start with sk_live_ (or rk_live_ for restricted keys); everything else is test mode. */
export function paymentModeOfKey(secretKey: string): PaymentMode {
  return /^[sr]k_live_/.test(secretKey) ? "live" : "test";
}
