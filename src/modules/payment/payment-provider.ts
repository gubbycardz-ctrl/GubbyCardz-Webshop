// The shop only knows this interface, never Stripe: the provider stays replaceable,
// and the order logic can be tested without it.

export type CheckoutLine = { name: string; description?: string; unitAmountCents: number; quantity: number };

export type CheckoutRequest = {
  orderId: string;
  /** Short number the customer also sees in the shop. */
  orderNumber: string;
  email: string;
  lines: readonly CheckoutLine[];
  shipping: { label: string; amountCents: number };
  successUrl: string;
  cancelUrl: string;
  /** Unpaid by then, the checkout ends – and the reserved stock is released. */
  expiresAt: Date;
};

export type CheckoutSession = { id: string; url: string };

/** Only the outcomes the shop acts on; the provider ignores all other events. */
export type PaymentEvent =
  | { type: "paid"; orderId: string; sessionId: string; amountCents: number }
  | { type: "failed"; orderId: string; sessionId: string };

/** Test payments cost nothing, so the shop treats them differently (see orders/ordering-access.ts). */
export type PaymentMode = "test" | "live";

export interface PaymentProvider {
  readonly mode: PaymentMode;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Ends an open checkout so it can no longer be paid. False if it had already ended (paid or expired). */
  expireCheckout(sessionId: string): Promise<boolean>;
  /** Checks the signature first; throws PaymentWebhookError for anything that does not come from the provider. */
  parseWebhook(payload: string, headers: Headers): PaymentEvent | null;
}

export class PaymentWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentWebhookError";
  }
}
