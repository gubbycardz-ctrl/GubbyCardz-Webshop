import { describe, expect, it } from "vitest";
import type { OrderLine } from "./order";
import { packingList } from "./packing-list";

const line = (offerId: string, storageLocation?: string): OrderLine => ({
  offerId,
  productId: "p1",
  productName: "Glurak ex",
  description: "Deutsch · Near Mint (NM)",
  unitPriceCents: 1000,
  quantity: 1,
  storageLocation,
});

describe("packingList", () => {
  it("sorts by storage location with natural numbers and puts unknown locations last", () => {
    const lines = [line("a"), line("b", "Ordner 10"), line("c", "ordner 2"), line("d", "Ordner 2 / S. 3"), line("e")];

    expect(packingList({ lines }).map((entry) => entry.offerId)).toEqual(["c", "d", "b", "a", "e"]);
  });

  it("leaves the order itself untouched", () => {
    const lines = [line("a", "B"), line("b", "A")];
    packingList({ lines });
    expect(lines.map((entry) => entry.offerId)).toEqual(["a", "b"]);
  });
});
