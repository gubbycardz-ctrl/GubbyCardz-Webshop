import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CatalogRepository, Offer, Product } from "@/modules/catalog";
import { createFirestoreCatalogRepository } from "@/modules/catalog/server";
import { OrderError, type Order, type OrderRepository } from ".";
import { createFirestoreOrderRepository } from "./firestore-order-repository";

const PROJECT_ID = "demo-gubbycardz";

const card: Product = { id: "p1", kind: "single", name: "Glurak ex", slug: "glurak", gameId: "pokemon", setId: "mew", collectorNumber: "199/165", rarity: "SIR" };
const lastCopy: Offer = { id: "o-last", productId: "p1", type: "raw-card", language: "de", condition: "near-mint", priceCents: 11999, stock: 1 };
const plenty: Offer = { ...lastCopy, id: "o-plenty", condition: "excellent", priceCents: 5000, stock: 10 };

function orderFor(id: string, lines: { offer: Offer; quantity: number }[]): Order {
  const subtotalCents = lines.reduce((sum, { offer, quantity }) => sum + offer.priceCents * quantity, 0);
  return {
    id,
    status: "awaiting-payment",
    createdAt: new Date().toISOString(),
    email: "kunde@example.com",
    shippingAddress: { name: "Max", street: "Hauptstraße 1", postalCode: "10115", city: "Berlin", country: "DE" },
    lines: lines.map(({ offer, quantity }) => ({
      offerId: offer.id,
      productId: offer.productId,
      productName: "Glurak ex",
      description: "Deutsch · Near Mint (NM)",
      unitPriceCents: offer.priceCents,
      quantity,
    })),
    subtotalCents,
    shippingCents: 769,
    totalCents: subtotalCents + 769,
  };
}

let app: App;
let db: Firestore;
let catalog: CatalogRepository;
let orders: OrderRepository;

const stockOf = async (offerId: string) => (await catalog.getOffersByIds([offerId]))[0]?.stock;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firestore emulator not running – use `npm run test:integration`");
  }
  app = initializeApp({ projectId: PROJECT_ID }, "orders-integration-test");
  db = getFirestore(app);
  catalog = createFirestoreCatalogRepository(db);
  orders = createFirestoreOrderRepository(db);
});

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE",
  });
  await catalog.saveProduct(card);
  await catalog.saveOffer(lastCopy);
  await catalog.saveOffer(plenty);
});

afterAll(async () => {
  await deleteApp(app);
});

describe("placeOrder", () => {
  it("stores the order and reserves its stock", async () => {
    const order = orderFor("order-1", [{ offer: lastCopy, quantity: 1 }, { offer: plenty, quantity: 3 }]);

    await orders.placeOrder(order);

    expect(await orders.getOrder("order-1")).toEqual(order);
    expect(await stockOf(lastCopy.id)).toBe(0);
    expect(await stockOf(plenty.id)).toBe(7);
  });

  it("changes nothing when any line is short", async () => {
    const order = orderFor("order-2", [{ offer: plenty, quantity: 3 }, { offer: lastCopy, quantity: 2 }]);

    await expect(orders.placeOrder(order)).rejects.toThrow(OrderError);

    expect(await orders.getOrder("order-2")).toBeNull();
    expect(await stockOf(plenty.id)).toBe(10);
    expect(await stockOf(lastCopy.id)).toBe(1);
  });

  it("sells the last copy only once when two customers order at the same time", async () => {
    const results = await Promise.allSettled([
      orders.placeOrder(orderFor("race-a", [{ offer: lastCopy, quantity: 1 }])),
      orders.placeOrder(orderFor("race-b", [{ offer: lastCopy, quantity: 1 }])),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf(lastCopy.id)).toBe(0);
  });

  it("never stores the same order id twice", async () => {
    await orders.placeOrder(orderFor("order-3", [{ offer: plenty, quantity: 1 }]));
    await expect(orders.placeOrder(orderFor("order-3", [{ offer: plenty, quantity: 1 }]))).rejects.toThrow();
    expect(await stockOf(plenty.id)).toBe(9);
  });
});

describe("payment outcome", () => {
  beforeEach(async () => {
    await orders.placeOrder(orderFor("order-p", [{ offer: plenty, quantity: 4 }]));
    await orders.attachPaymentSession("order-p", "cs_test_123");
  });

  it("marks a paid order once", async () => {
    expect(await orders.markPaid("order-p", new Date())).toBe("paid");
    expect(await orders.markPaid("order-p", new Date())).toBe("unchanged");

    const order = await orders.getOrder("order-p");
    expect(order).toMatchObject({ status: "paid", paymentSessionId: "cs_test_123" });
    expect(await stockOf(plenty.id)).toBe(6);
  });

  it("returns stock exactly once when cancelled", async () => {
    expect(await orders.cancel("order-p", new Date())).toBe("cancelled");
    expect(await orders.cancel("order-p", new Date())).toBe("unchanged");

    expect((await orders.getOrder("order-p"))?.status).toBe("cancelled");
    expect(await stockOf(plenty.id)).toBe(10);
  });

  it("never cancels a paid order or pays a cancelled one", async () => {
    await orders.markPaid("order-p", new Date());
    expect(await orders.cancel("order-p", new Date())).toBe("unchanged");
    expect(await stockOf(plenty.id)).toBe(6);

    await orders.placeOrder(orderFor("order-c", [{ offer: plenty, quantity: 1 }]));
    await orders.cancel("order-c", new Date());
    expect(await orders.markPaid("order-c", new Date())).toBe("unchanged");
  });

  it("does not resurrect deleted offers when returning stock", async () => {
    await db.collection("offers").doc(plenty.id).delete();

    expect(await orders.cancel("order-p", new Date())).toBe("cancelled");
    expect(await stockOf(plenty.id)).toBeUndefined();
  });

  it("reports unknown orders", async () => {
    await expect(orders.markPaid("missing", new Date())).rejects.toThrow(OrderError);
  });
});
