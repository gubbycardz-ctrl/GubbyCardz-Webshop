import { describe, expect, it } from "vitest";
import { mapWithLimit } from "./concurrency";

describe("mapWithLimit", () => {
  it("keeps the order of the results and never exceeds the limit", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapWithLimit([5, 1, 4, 2, 3], 2, async (value) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value));
      running--;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it("handles an empty list and propagates errors", async () => {
    expect(await mapWithLimit([], 3, async (value) => value)).toEqual([]);
    await expect(mapWithLimit([1, 2], 2, async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});
