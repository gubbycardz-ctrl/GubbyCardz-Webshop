import { describe, expect, it } from "vitest";
import { describeOffer, describeProductKind } from ".";

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

describe("describeProductKind", () => {
  it("names the category of sealed products and falls back to the kind", () => {
    const sealed = { id: "p1", kind: "sealed", name: "151 ETB", slug: "151-etb", gameId: "pokemon" } as const;
    expect(describeProductKind({ ...sealed, category: "elite-trainer-box" })).toBe("Elite Trainer Box");
    expect(describeProductKind(sealed)).toBe("Sealed");
    expect(describeProductKind({ id: "p2", kind: "accessory", name: "Sleeves", slug: "sleeves" })).toBe("Zubehör");
  });
});
