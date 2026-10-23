import { describe, expect, it } from "vitest";
import { SHIPPING_COUNTRY_CODES, exceedsMaxOrderValue, shippingCostCents } from "./shipping-rates";

describe("shipping rates", () => {
  it("ships to Germany and the Netherlands only", () => {
    expect(SHIPPING_COUNTRY_CODES).toEqual(["DE", "NL"]);
  });

  it("charges the insured 5 kg parcel rates", () => {
    expect(shippingCostCents("DE")).toBe(769);
    expect(shippingCostCents("NL")).toBe(1749);
  });

  it("uses positive integer cents everywhere", () => {
    for (const country of SHIPPING_COUNTRY_CODES) {
      expect(Number.isInteger(shippingCostCents(country))).toBe(true);
      expect(shippingCostCents(country)).toBeGreaterThan(0);
    }
  });
});

describe("exceedsMaxOrderValue", () => {
  it("allows goods worth up to exactly 500,00 €", () => {
    expect(exceedsMaxOrderValue(50_000)).toBe(false);
    expect(exceedsMaxOrderValue(0)).toBe(false);
  });

  it("refuses anything above the insured value", () => {
    expect(exceedsMaxOrderValue(50_001)).toBe(true);
  });
});
