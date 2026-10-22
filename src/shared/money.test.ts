import { describe, expect, it } from "vitest";
import { formatEuro } from "./money";

describe("formatEuro", () => {
  it("formats cents in German notation", () => {
    // Intl uses a non-breaking space before the euro sign.
    expect(formatEuro(3999)).toBe("39,99 €");
    expect(formatEuro(125000)).toBe("1.250,00 €");
    expect(formatEuro(5)).toBe("0,05 €");
  });
});
