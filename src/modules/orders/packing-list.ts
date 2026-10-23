import type { Order, OrderLine } from "./order";

const byStorageLocation = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

/**
 * The order lines in the order they are picked from storage: sorted by storage location
 * ("Ordner 2" before "Ordner 10"), lines without a location last.
 */
export function packingList(order: Pick<Order, "lines">): OrderLine[] {
  return [...order.lines].sort((a, b) => {
    if (!a.storageLocation || !b.storageLocation) {
      return Number(!a.storageLocation) - Number(!b.storageLocation);
    }
    return byStorageLocation.compare(a.storageLocation, b.storageLocation);
  });
}
