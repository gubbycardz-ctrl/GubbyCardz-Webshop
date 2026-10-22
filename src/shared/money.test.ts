import { describe, expect, it } from "vitest";
import { centsToEuroInput, formatEuro, parseEuroToCents } from "./money";

describe("formatEuro", () => {
  it("formats cents in German notation", () => {
    // Intl uses a non-breaking space before the euro sign.
    expect(formatEuro(3999)).toBe("39,99 €");
    expect(formatEuro(125000)).toBe("1.250,00 €");
    expect(formatEuro(5)).toBe("0,05 €");
  });
});

describe("centsToEuroInput", () => {
  it("produces values parseEuroToCents reads back", () => {
    for (const cents of [5, 3999, 125000]) {
      expect(parseEuroToCents(centsToEuroInput(cents))).toBe(cents);
    }
  });
});

describe("parseEuroToCents", () => {
  it.each([
    ["39,99", 3999],
    ["39,9", 3990],
    ["39", 3900],
    ["0,05", 5],
    ["1.250,00", 125000],
    ["1.250", 125000],
    ["39.99", 3999],
    [" 39,99 € ", 3999],
    ["19,99", 1999],
  ])("reads %s as %i cents", (input, cents) => {
    expect(parseEuroToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "39,999", "-5", "3,99,1", "1,250.00"])("rejects %j", (input) => {
    expect(parseEuroToCents(input)).toBeNull();
  });
});
