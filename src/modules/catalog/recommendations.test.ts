import { describe, expect, it } from "vitest";
import type { Product } from "./product";
import { pickRecommendations } from "./recommendations";

const product = (id: string): Product => ({ id, kind: "accessory", name: id, slug: id });

describe("pickRecommendations", () => {
  it("keeps the order, skips excluded and sold-out products and stops at the limit", () => {
    const candidates = ["a", "b", "c", "d", "e"].map(product);
    const result = pickRecommendations(candidates, {
      excludedProductIds: new Set(["a"]),
      isAvailable: (id) => id !== "c",
      limit: 2,
    });
    expect(result.map(({ id }) => id)).toEqual(["b", "d"]);
  });
});
