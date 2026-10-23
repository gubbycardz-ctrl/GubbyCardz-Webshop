import type { Order, OrderStatus } from "./order";

export const ORDER_LIST_LIMIT = 50;

// Storage-independent contract for orders.
export interface OrderRepository {
  /** Stores the order and reserves its stock atomically. Fails with OrderError if stock is short. */
  placeOrder(order: Order): Promise<void>;
  getOrder(id: string): Promise<Order | null>;
  /** Newest first, optionally only one status. At most ORDER_LIST_LIMIT orders. */
  listOrders(query: { status?: OrderStatus }): Promise<Order[]>;
  attachPaymentSession(id: string, paymentSessionId: string): Promise<void>;
  /** Idempotent: only an order awaiting payment becomes paid. */
  markPaid(id: string, at: Date): Promise<"paid" | "unchanged">;
  /** Idempotent: only an order awaiting payment is cancelled, so stock is returned exactly once. */
  cancel(id: string, at: Date): Promise<"cancelled" | "unchanged">;
  /** Idempotent: only a paid order is shipped. */
  markShipped(id: string, at: Date): Promise<"shipped" | "unchanged">;
}

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}
