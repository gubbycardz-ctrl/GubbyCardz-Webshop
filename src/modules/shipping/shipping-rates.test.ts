import { describe, expect, it } from "vitest";
import { SHIPPING_COUNTRY_CODES, shippingCostCents } from "./shipping-rates";

describe("shipping rates", () => {
  it("ships to Germany and the Netherlands only", () => {
    expect(SHIPPING_COUNTRY_CODES).toEqual(["DE", "NL"]);
  });

  it("charges the insured 5 kg parcel rate in Germany", () => {
    expect(shippingCostCents("DE")).toBe(769);
  });

  it("uses positive integer cents everywhere", () => {
    for (const country of SHIPPING_COUNTRY_CODES) {
      expect(Number.isInteger(shippingCostCents(country))).toBe(true);
      expect(shippingCostCents(country)).toBeGreaterThan(0);
    }
  });
});
