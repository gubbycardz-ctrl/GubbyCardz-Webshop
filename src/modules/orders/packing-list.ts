import type { Order, OrderLine } from "./order";

export type PackingListLine = OrderLine & { storageLocation?: string };

const byStorageLocation = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

/**
 * The order lines in the order they are picked from storage: sorted by storage location
 * ("Ordner 2" before "Ordner 10"), lines without a location last.
 * Locations are looked up when packing, not copied into the order, because items may
 * have moved since the order was placed.
 */
export function packingList(
  order: Pick<Order, "lines">,
  storageLocations: ReadonlyMap<string, string | undefined>,
): PackingListLine[] {
  return order.lines
    .map((line) => ({ ...line, storageLocation: storageLocations.get(line.offerId) }))
    .sort((a, b) => {
      if (!a.storageLocation || !b.storageLocation) {
        return Number(!a.storageLocation) - Number(!b.storageLocation);
      }
      return byStorageLocation.compare(a.storageLocation, b.storageLocation);
    });
}
