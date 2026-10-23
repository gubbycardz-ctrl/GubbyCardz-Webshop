import { describe, expect, it } from "vitest";
import type { OrderLine } from "./order";
import { packingList } from "./packing-list";

const line = (offerId: string): OrderLine => ({
  offerId,
  productId: "p1",
  productName: "Glurak ex",
  description: "Deutsch · Near Mint (NM)",
  unitPriceCents: 1000,
  quantity: 1,
});

describe("packingList", () => {
  it("sorts by current storage location with natural numbers and puts unknown locations last", () => {
    const lines = ["a", "b", "c", "d", "e"].map(line);
    const locations = new Map([
      ["b", "Ordner 10"],
      ["c", "ordner 2"],
      ["d", "Ordner 2 / S. 3"],
    ]);

    const packed = packingList({ lines }, locations);

    expect(packed.map((entry) => entry.offerId)).toEqual(["c", "d", "b", "a", "e"]);
    expect(packed[0].storageLocation).toBe("ordner 2");
  });

  it("leaves the order itself untouched", () => {
    const lines = [line("a"), line("b")];
    packingList({ lines }, new Map([["a", "B"], ["b", "A"]]));
    expect(lines.map((entry) => entry.offerId)).toEqual(["a", "b"]);
  });
});
