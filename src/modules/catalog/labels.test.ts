import { describe, expect, it } from "vitest";
import { describeOffer } from ".";

const base = { id: "o1", productId: "p1", priceCents: 100, stock: 1 };

describe("describeOffer", () => {
  it("describes raw cards with language and condition", () => {
    expect(describeOffer({ ...base, type: "raw-card", language: "de", condition: "near-mint" })).toBe(
      "Deutsch · Near Mint (NM)",
    );
  });

  it("describes graded cards with German decimal grades", () => {
    expect(
      describeOffer({ ...base, type: "graded-card", language: "ja", gradingCompany: "bgs", grade: 9.5, certNumber: "0012" }),
    ).toBe("Japanisch · BGS (Beckett) 9,5 · Zert.-Nr. 0012");
  });

  it("describes sealed products by language and accessories as new", () => {
    expect(describeOffer({ ...base, type: "sealed", language: "zh-Hans" })).toBe("Chinesisch (vereinfacht)");
    expect(describeOffer({ ...base, type: "accessory" })).toBe("Neu");
  });
});
