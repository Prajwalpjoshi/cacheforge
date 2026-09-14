import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "../src/benchmark/concurrency.js";

describe("runWithConcurrency", () => {
  it("runs every iteration exactly once and returns results in order", async () => {
    const results = await runWithConcurrency(10, 3, async (i) => i * 2);
    expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  });

  it("never exceeds the requested concurrency", async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency(20, 4, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(4);
    expect(maxActive).toBeGreaterThan(1); // actually ran concurrently, not serialized
  });

  it("handles concurrency higher than the iteration count", async () => {
    const results = await runWithConcurrency(3, 20, async (i) => i);
    expect(results).toEqual([0, 1, 2]);
  });

  it("handles a single iteration", async () => {
    const results = await runWithConcurrency(1, 5, async (i) => `item-${i}`);
    expect(results).toEqual(["item-0"]);
  });

  it("handles zero iterations", async () => {
    const results = await runWithConcurrency(0, 5, async () => {
      throw new Error("should never be called");
    });
    expect(results).toEqual([]);
  });

  it("propagates a task error", async () => {
    await expect(
      runWithConcurrency(5, 2, async (i) => {
        if (i === 2) throw new Error("boom");
        return i;
      }),
    ).rejects.toThrow("boom");
  });
});
