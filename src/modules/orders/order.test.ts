import { describe, expect, it } from "vitest";
import { orderNumber } from "./order";

describe("orderNumber", () => {
  it("derives a short, readable number from the order id", () => {
    expect(orderNumber("3f2a9c1e-7b4d-4e8a-9f00-123456789abc")).toBe("3F2A9C1E");
  });
});
