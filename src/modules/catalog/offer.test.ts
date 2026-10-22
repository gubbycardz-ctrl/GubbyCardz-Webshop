import { describe, expect, it } from "vitest";
import { DEFAULT_CARD_CONDITION, isOfferTypeAllowedFor, offerSchema } from ".";

const rawCard = {
  id: "o1",
  productId: "p1",
  type: "raw-card",
  language: "de",
  condition: "near-mint",
  priceCents: 3999,
  stock: 1,
};

const gradedCard = {
  id: "o2",
  productId: "p1",
  type: "graded-card",
  language: "ja",
  gradingCompany: "psa",
  grade: 10,
  certNumber: "12345678",
  priceCents: 25000,
  stock: 1,
};

describe("offerSchema", () => {
  it("accepts a raw card offer", () => {
    expect(offerSchema.parse(rawCard)).toEqual(rawCard);
  });

  it("accepts Simplified Chinese cards", () => {
    expect(offerSchema.safeParse({ ...rawCard, language: "zh-Hans" }).success).toBe(true);
  });

  it("rejects unknown languages and conditions", () => {
    expect(offerSchema.safeParse({ ...rawCard, language: "fr" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...rawCard, condition: "like-new" }).success).toBe(false);
  });

  it("rejects prices that are not whole cents", () => {
    expect(offerSchema.safeParse({ ...rawCard, priceCents: 39.99 }).success).toBe(false);
  });

  it("rejects free or negative prices", () => {
    expect(offerSchema.safeParse({ ...rawCard, priceCents: 0 }).success).toBe(false);
    expect(offerSchema.safeParse({ ...rawCard, priceCents: -100 }).success).toBe(false);
  });

  it("allows zero stock but not negative stock", () => {
    expect(offerSchema.safeParse({ ...rawCard, stock: 0 }).success).toBe(true);
    expect(offerSchema.safeParse({ ...rawCard, stock: -1 }).success).toBe(false);
  });

  it("accepts graded cards with whole and half grades", () => {
    expect(offerSchema.safeParse(gradedCard).success).toBe(true);
    expect(offerSchema.safeParse({ ...gradedCard, gradingCompany: "bgs", grade: 9.5 }).success).toBe(true);
  });

  it("rejects grades outside 1–10 or between half steps", () => {
    for (const grade of [0, 10.5, 9.3]) {
      expect(offerSchema.safeParse({ ...gradedCard, grade }).success).toBe(false);
    }
  });

  it("rejects graded cards without certificate number", () => {
    expect(offerSchema.safeParse({ ...gradedCard, certNumber: " " }).success).toBe(false);
  });

  it("accepts accessories without language", () => {
    const sleeves = { id: "o3", productId: "p3", type: "accessory", priceCents: 899, stock: 20 };
    expect(offerSchema.safeParse(sleeves).success).toBe(true);
  });
});

describe("isOfferTypeAllowedFor", () => {
  it("allows raw and graded offers for single cards only", () => {
    expect(isOfferTypeAllowedFor("single", "raw-card")).toBe(true);
    expect(isOfferTypeAllowedFor("single", "graded-card")).toBe(true);
    expect(isOfferTypeAllowedFor("sealed", "raw-card")).toBe(false);
    expect(isOfferTypeAllowedFor("accessory", "graded-card")).toBe(false);
  });

  it("matches sealed and accessory offers to their product kind", () => {
    expect(isOfferTypeAllowedFor("sealed", "sealed")).toBe(true);
    expect(isOfferTypeAllowedFor("accessory", "accessory")).toBe(true);
    expect(isOfferTypeAllowedFor("single", "sealed")).toBe(false);
  });
});

describe("DEFAULT_CARD_CONDITION", () => {
  it("is Near Mint", () => {
    expect(DEFAULT_CARD_CONDITION).toBe("near-mint");
  });
});
