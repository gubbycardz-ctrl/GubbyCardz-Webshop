import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { PaymentWebhookError, type CheckoutRequest } from "./payment-provider";
import { createStripePaymentProvider, paymentModeOfKey } from "./stripe-provider";

const WEBHOOK_SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");
const provider = createStripePaymentProvider(stripe, WEBHOOK_SECRET, "test");

function signed(type: string, session: Record<string, unknown>) {
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { object: "checkout.session", ...session } } });
  const headers = new Headers({ "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }) });
  return { payload, headers };
}

function parse(type: string, session: Record<string, unknown>) {
  const { payload, headers } = signed(type, session);
  return provider.parseWebhook(payload, headers);
}

const paidSession = { id: "cs_1", payment_status: "paid", amount_total: 8769, metadata: { orderId: "order-1" } };

describe("parseWebhook", () => {
  it("turns completed and later succeeded checkouts into paid events", () => {
    const paid = { type: "paid", orderId: "order-1", sessionId: "cs_1", amountCents: 8769 };
    expect(parse("checkout.session.completed", paidSession)).toEqual(paid);
    expect(parse("checkout.session.async_payment_succeeded", paidSession)).toEqual(paid);
  });

  it("waits while a delayed payment (SEPA) is still unpaid", () => {
    expect(parse("checkout.session.completed", { ...paidSession, payment_status: "unpaid" })).toBeNull();
  });

  it("turns expired and failed checkouts into failed events", () => {
    const failed = { type: "failed", orderId: "order-1", sessionId: "cs_1" };
    expect(parse("checkout.session.expired", { ...paidSession, payment_status: "unpaid" })).toEqual(failed);
    expect(parse("checkout.session.async_payment_failed", paidSession)).toEqual(failed);
  });

  it("ignores other events and checkouts without an order", () => {
    expect(parse("charge.refunded", paidSession)).toBeNull();
    expect(parse("checkout.session.completed", { ...paidSession, metadata: {} })).toBeNull();
  });

  it("rejects payloads without a valid signature", () => {
    const { payload, headers } = signed("checkout.session.completed", paidSession);
    const tampered = payload.replace("8769", "1");
    expect(() => provider.parseWebhook(tampered, headers)).toThrow(PaymentWebhookError);
    expect(() => provider.parseWebhook(payload, new Headers())).toThrow(PaymentWebhookError);
    const otherSecret = createStripePaymentProvider(stripe, "whsec_other", "test");
    expect(() => otherSecret.parseWebhook(payload, headers)).toThrow(PaymentWebhookError);
  });
});

describe("createCheckout", () => {
  const request: CheckoutRequest = {
    orderId: "order-1",
    orderNumber: "ORDER1AB",
    email: "kunde@example.com",
    lines: [{ name: "Glurak ex", description: "Deutsch · Near Mint", unitAmountCents: 8000, quantity: 1 }],
    shipping: { label: "Versand nach Deutschland (versichert)", amountCents: 769 },
    successUrl: "https://shop.example/kasse/danke",
    cancelUrl: "https://shop.example/kasse/abgebrochen",
    expiresAt: new Date("2026-10-23T12:31:00.000Z"),
  };

  it("sends amounts in cents, the order id and an idempotency key", async () => {
    const create = vi
      .spyOn(stripe.checkout.sessions, "create")
      .mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" } as Stripe.Response<Stripe.Checkout.Session>);

    expect(await provider.createCheckout(request)).toEqual({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
    const [params, options] = create.mock.calls[0];
    expect(params).toMatchObject({
      mode: "payment",
      customer_email: "kunde@example.com",
      metadata: { orderId: "order-1" },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 8000, product_data: { name: "Glurak ex" } } }],
      shipping_options: [{ shipping_rate_data: { fixed_amount: { amount: 769, currency: "eur" } } }],
      expires_at: Date.UTC(2026, 9, 23, 12, 31) / 1000,
    });
    expect(options).toEqual({ idempotencyKey: "checkout-order-1" });
  });
});

describe("paymentModeOfKey", () => {
  it("treats only live keys as live", () => {
    expect(paymentModeOfKey("sk_live_abc")).toBe("live");
    expect(paymentModeOfKey("rk_live_abc")).toBe("live");
    expect(paymentModeOfKey("sk_test_abc")).toBe("test");
  });
});
