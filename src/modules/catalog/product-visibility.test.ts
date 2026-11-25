import { describe, expect, it } from "vitest";
import { isShopVisible, productSchema, type Product } from "./product";

const tin: Product = { id: "p1", kind: "sealed", name: "Tin", slug: "tin", gameId: "pokemon" };

describe("isShopVisible", () => {
  it("treats products without the flag as visible, so everything created before it stays public", () => {
    expect(isShopVisible(tin)).toBe(true);
    expect(isShopVisible({ ...tin, hidden: false })).toBe(true);
  });

  it("hides products marked as hidden", () => {
    expect(isShopVisible({ ...tin, hidden: true })).toBe(false);
  });

  it("is part of the product schema and optional", () => {
    expect(productSchema.parse({ ...tin, hidden: true })).toMatchObject({ hidden: true });
    expect(productSchema.parse(tin)).not.toHaveProperty("hidden");
    expect(productSchema.safeParse({ ...tin, hidden: "yes" }).success).toBe(false);
  });
});
