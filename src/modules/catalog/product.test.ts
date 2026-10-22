import { describe, expect, it } from "vitest";
import { productSchema } from ".";

const charizard = {
  id: "p1",
  kind: "single",
  name: "Glurak ex",
  slug: "glurak-ex-199-165",
  gameId: "pokemon",
  setId: "sv3pt5",
  collectorNumber: "199/165",
  rarity: "Special Illustration Rare",
};

describe("productSchema", () => {
  it("accepts a single card", () => {
    expect(productSchema.parse(charizard)).toEqual(charizard);
  });

  it("rejects a single card without set", () => {
    expect(productSchema.safeParse({ ...charizard, setId: undefined }).success).toBe(false);
  });

  it("accepts a sealed product spanning several sets", () => {
    const box = { id: "p2", kind: "sealed", name: "Premium Collection", slug: "premium-collection", gameId: "one-piece" };
    expect(productSchema.safeParse(box).success).toBe(true);
  });

  it("accepts a game-independent accessory", () => {
    const sleeves = { id: "p3", kind: "accessory", name: "Sleeves schwarz", slug: "sleeves-schwarz" };
    expect(productSchema.safeParse(sleeves).success).toBe(true);
  });

  it("rejects slugs that are not URL-safe", () => {
    expect(productSchema.safeParse({ ...charizard, slug: "Glurak EX!" }).success).toBe(false);
  });

  it("rejects unknown product kinds", () => {
    expect(productSchema.safeParse({ ...charizard, kind: "mystery" }).success).toBe(false);
  });
});
