import { describe, expect, it, vi } from "vitest";
import type { PaymentEvent } from "@/modules/payment";
import type { Order, OrderStatus } from "./order";
import type { OrderRepository } from "./order-repository";
import { abandonCheckout, applyPaymentEvent } from "./payment-events";

const now = new Date("2026-10-23T12:00:00Z");

function order(status: OrderStatus = "awaiting-payment"): Order {
  return {
    id: "order-1",
    status,
    createdAt: "2026-10-23T11:00:00.000Z",
    email: "kunde@example.com",
    shippingAddress: { name: "Max", street: "Hauptstraße 1", postalCode: "10115", city: "Berlin", country: "DE" },
    lines: [{ offerId: "o1", productId: "p1", productName: "Glurak ex", description: "Deutsch", unitPriceCents: 8000, quantity: 1 }],
    subtotalCents: 8000,
    shippingCents: 769,
    totalCents: 8769,
    paymentSessionId: "cs_1",
  };
}

/** Behaves like the real repository: markPaid and cancel only change orders awaiting payment. */
function repositoryWith(stored: Order | null) {
  const awaiting = stored?.status === "awaiting-payment";
  const repository = {
    getOrder: vi.fn(async () => stored),
    markPaid: vi.fn(async (): Promise<"paid" | "unchanged"> => (awaiting ? "paid" : "unchanged")),
    cancel: vi.fn(async (): Promise<"cancelled" | "unchanged"> => (awaiting ? "cancelled" : "unchanged")),
  };
  return repository as typeof repository & OrderRepository;
}

const paid: PaymentEvent = { type: "paid", orderId: "order-1", sessionId: "cs_1", amountCents: 8769 };
const failed: PaymentEvent = { type: "failed", orderId: "order-1", sessionId: "cs_1" };

describe("applyPaymentEvent", () => {
  it("marks the order paid when the amount matches", async () => {
    const repository = repositoryWith(order());
    expect(await applyPaymentEvent(paid, repository, now)).toBe("paid");
    expect(repository.markPaid).toHaveBeenCalledWith("order-1", now);
  });

  it("never marks an order paid for a different amount", async () => {
    const repository = repositoryWith(order());
    expect(await applyPaymentEvent({ ...paid, amountCents: 100 }, repository, now)).toBe("amount-mismatch");
    expect(repository.markPaid).not.toHaveBeenCalled();
  });

  it("cancels on failed or expired payments, which returns the stock", async () => {
    const repository = repositoryWith(order());
    expect(await applyPaymentEvent(failed, repository, now)).toBe("cancelled");
    expect(repository.cancel).toHaveBeenCalledWith("order-1", now);
  });

  it("is harmless when an event arrives twice", async () => {
    expect(await applyPaymentEvent(paid, repositoryWith(order("paid")), now)).toBe("unchanged");
    expect(await applyPaymentEvent(failed, repositoryWith(order("cancelled")), now)).toBe("unchanged");
  });

  it("flags money for an order cancelled before, so it can be refunded", async () => {
    expect(await applyPaymentEvent(paid, repositoryWith(order("cancelled")), now)).toBe("paid-after-cancel");
  });

  it("ignores unknown orders and events of another checkout", async () => {
    expect(await applyPaymentEvent(paid, repositoryWith(null), now)).toBe("ignored");
    const repository = repositoryWith(order());
    expect(await applyPaymentEvent({ ...failed, sessionId: "cs_old" }, repository, now)).toBe("ignored");
    expect(repository.cancel).not.toHaveBeenCalled();
  });
});

describe("abandonCheckout", () => {
  it("ends the checkout first and then cancels the order", async () => {
    const repository = repositoryWith(order());
    const expireCheckout = vi.fn(async () => true);
    expect(await abandonCheckout("order-1", { expireCheckout }, repository, now)).toMatchObject({ id: "order-1" });
    expect(expireCheckout).toHaveBeenCalledWith("cs_1");
    expect(repository.cancel).toHaveBeenCalledWith("order-1", now);
  });

  it("leaves the order alone when the checkout was already completed", async () => {
    const repository = repositoryWith(order());
    expect(await abandonCheckout("order-1", { expireCheckout: async () => false }, repository, now)).toBeNull();
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it("does nothing for paid or unknown orders", async () => {
    const expireCheckout = vi.fn(async () => true);
    expect(await abandonCheckout("order-1", { expireCheckout }, repositoryWith(order("paid")), now)).toBeNull();
    expect(await abandonCheckout("order-1", { expireCheckout }, repositoryWith(null), now)).toBeNull();
    expect(expireCheckout).not.toHaveBeenCalled();
  });
});
