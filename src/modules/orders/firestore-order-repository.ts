import type { DocumentData, Firestore, Transaction } from "firebase-admin/firestore";
import { prepareStockChange } from "@/modules/catalog/server";
import { orderSchema, type Order } from "./order";
import { ORDER_LIST_LIMIT, OrderError, type OrderRepository } from "./order-repository";

const ORDERS_COLLECTION = "orders";

export function createFirestoreOrderRepository(db: Firestore): OrderRepository {
  const orders = db.collection(ORDERS_COLLECTION);
  const stockItems = (order: Order) => order.lines.map(({ offerId, quantity }) => ({ offerId, quantity }));

  return {
    async placeOrder(order) {
      const valid = orderSchema.parse(order);
      await db.runTransaction(async (transaction) => {
        const stock = await prepareStockChange(db, transaction, stockItems(valid), "reserve");
        if (stock.shortages.length > 0) {
          throw new OrderError("Einige Artikel wurden gerade verkauft. Bitte prüfe deinen Warenkorb.");
        }
        stock.commit();
        transaction.create(orders.doc(valid.id), toDocument(valid));
      });
    },

    async getOrder(id) {
      const doc = await orders.doc(id).get();
      return doc.exists ? orderSchema.parse(doc.data()) : null;
    },

    async listOrders({ status }) {
      const filtered = status ? orders.where("status", "==", status) : orders;
      const snapshot = await filtered.orderBy("createdAt", "desc").limit(ORDER_LIST_LIMIT).get();
      return snapshot.docs.map((doc) => orderSchema.parse(doc.data()));
    },

    async attachPaymentSession(id, paymentSessionId) {
      await orders.doc(id).update({ paymentSessionId });
    },

    async markPaid(id, at) {
      return db.runTransaction(async (transaction) => {
        const order = await readOrder(transaction, id);
        if (order.status !== "awaiting-payment") return "unchanged";
        transaction.update(orders.doc(id), { status: "paid", paidAt: at.toISOString() });
        return "paid";
      });
    },

    async cancel(id, at) {
      return db.runTransaction(async (transaction) => {
        const order = await readOrder(transaction, id);
        if (order.status !== "awaiting-payment") return "unchanged";
        const stock = await prepareStockChange(db, transaction, stockItems(order), "release");
        stock.commit();
        transaction.update(orders.doc(id), { status: "cancelled", cancelledAt: at.toISOString() });
        return "cancelled";
      });
    },

    async markShipped(id, at) {
      return db.runTransaction(async (transaction) => {
        const order = await readOrder(transaction, id);
        if (order.status !== "paid") return "unchanged";
        transaction.update(orders.doc(id), { status: "shipped", shippedAt: at.toISOString() });
        return "shipped";
      });
    },
  };

  async function readOrder(transaction: Transaction, id: string) {
    const doc = await transaction.get(orders.doc(id));
    if (!doc.exists) throw new OrderError(`Bestellung ${id} nicht gefunden`);
    return orderSchema.parse(doc.data());
  }
}

// Firestore rejects `undefined` values; optional fields are simply left out.
function toDocument(entity: object): DocumentData {
  return Object.fromEntries(Object.entries(entity).filter(([, value]) => value !== undefined));
}
