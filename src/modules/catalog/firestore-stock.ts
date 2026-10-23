import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { CATALOG_COLLECTIONS } from "./firestore-catalog-repository";
import { offerSchema } from "./offer";

export type StockItem = { offerId: string; quantity: number };
export type StockShortage = { offerId: string; available: number };

/**
 * Prepares a stock change inside a Firestore transaction that another module owns
 * (e.g. placing an order must reserve stock and store the order atomically).
 *
 * Firestore requires all reads before any write, so this reads now and returns
 * `commit()` for the caller to invoke after its own reads.
 */
export async function prepareStockChange(
  db: Firestore,
  transaction: Transaction,
  items: readonly StockItem[],
  direction: "reserve" | "release",
): Promise<{ shortages: StockShortage[]; commit: () => void }> {
  const offers = db.collection(CATALOG_COLLECTIONS.offers);
  const refs = items.map((item) => offers.doc(item.offerId));
  const snapshots = refs.length > 0 ? await transaction.getAll(...refs) : [];

  const shortages: StockShortage[] = [];
  snapshots.forEach((snapshot, index) => {
    const available = snapshot.exists ? offerSchema.parse(snapshot.data()).stock : 0;
    if (direction === "reserve" && available < items[index].quantity) {
      shortages.push({ offerId: items[index].offerId, available });
    }
  });

  const commit = () => {
    snapshots.forEach((snapshot, index) => {
      // An offer deleted in the meantime has no stock to give back.
      if (!snapshot.exists) return;
      const delta = direction === "reserve" ? -items[index].quantity : items[index].quantity;
      transaction.update(refs[index], { stock: FieldValue.increment(delta) });
    });
  };
  return { shortages, commit };
}
