// Server-only entry of the payment module: keeps the Stripe SDK and its keys out of client bundles.
import "server-only";
import Stripe from "stripe";
import type { PaymentProvider } from "./payment-provider";
import { createStripePaymentProvider, paymentModeOfKey } from "./stripe-provider";

export { createStripePaymentProvider, paymentModeOfKey } from "./stripe-provider";

/**
 * The configured provider, or null where no keys are set (locally, in CI) – then nobody can order.
 * Keys come from Secret Manager via apphosting.yaml, never from the repository.
 */
export function getPaymentProvider(): PaymentProvider | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  return createStripePaymentProvider(new Stripe(secretKey), webhookSecret, paymentModeOfKey(secretKey));
}
