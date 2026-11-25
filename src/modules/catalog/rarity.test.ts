import { describe, expect, it } from "vitest";
import { rarityTier } from "./rarity";

describe("rarityTier", () => {
  it.each([
    ["Special Illustration Rare", "epic"],
    ["Secret Rare", "epic"],
    ["Hyper Rare", "epic"],
    ["Illustration Rare", "rare"],
    ["Double Rare", "rare"],
    ["Super Rare", "rare"],
    ["Leader", "rare"],
    ["Common", "common"],
    ["Uncommon", "common"],
    ["", "common"],
  ] as const)("rates %s as %s", (rarity, tier) => {
    expect(rarityTier(rarity)).toBe(tier);
  });

  it("ignores letter case", () => {
    expect(rarityTier("SECRET RARE")).toBe("epic");
  });
});
