import type { Order } from "./order";

// Storage-independent contract for orders.
export interface OrderRepository {
  /** Stores the order and reserves its stock atomically. Fails with OrderError if stock is short. */
  placeOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  attachPaymentSession(id: string, paymentSessionId: string): Promise<void>;
  /** Idempotent: only an order awaiting payment becomes paid. */
  markPaid(id: string, at: Date): Promise<"paid" | "unchanged">;
  /** Idempotent: only an order awaiting payment is cancelled, so stock is returned exactly once. */
  cancel(id: string, at: Date): Promise<"cancelled" | "unchanged">;
}

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}
