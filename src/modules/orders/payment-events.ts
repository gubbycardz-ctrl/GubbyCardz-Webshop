import type { PaymentEvent, PaymentProvider } from "@/modules/payment";
import type { Order } from "./order";
import type { OrderRepository } from "./order-repository";

export type PaymentEventOutcome =
  | "paid"
  | "cancelled"
  | "unchanged"
  /** Paid, but the order was cancelled before – the money must be refunded by hand. */
  | "paid-after-cancel"
  /** Paid amount differs from the order total – never mark such an order as paid. */
  | "amount-mismatch"
  /** Unknown order, or an event of another checkout than the order's own. */
  | "ignored";

/**
 * Applies a verified payment event to its order. Safe to repeat: providers deliver events
 * at least once, and markPaid/cancel only ever change an order awaiting payment.
 */
export async function applyPaymentEvent(event: PaymentEvent, repository: OrderRepository, now: Date): Promise<PaymentEventOutcome> {
  const order = await repository.getOrder(event.orderId);
  if (!order || order.paymentSessionId !== event.sessionId) return "ignored";

  if (event.type === "failed") return repository.cancel(order.id, now);

  if (event.amountCents !== order.totalCents) return "amount-mismatch";
  const result = await repository.markPaid(order.id, now);
  return result === "unchanged" && order.status === "cancelled" ? "paid-after-cancel" : result;
}

/**
 * The customer left the payment page: end the checkout now instead of waiting for it to expire,
 * so the reserved stock is free again. Returns the cancelled order (to refill the cart), else null.
 */
export async function abandonCheckout(
  orderId: string,
  provider: Pick<PaymentProvider, "expireCheckout">,
  repository: OrderRepository,
  now: Date,
): Promise<Order | null> {
  const order = await repository.getOrder(orderId);
  if (order?.status !== "awaiting-payment" || !order.paymentSessionId) return null;
  // Cancel only once the checkout has ended – otherwise a second tab could still pay a cancelled order.
  if (!(await provider.expireCheckout(order.paymentSessionId))) return null;
  return (await repository.cancel(order.id, now)) === "cancelled" ? order : null;
}
