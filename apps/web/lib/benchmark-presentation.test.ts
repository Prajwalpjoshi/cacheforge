import { describe, expect, it } from "vitest";
import { describeImprovement } from "./benchmark-presentation";

describe("describeImprovement", () => {
  it("treats a positive latencyImprovementPct as improved, arrow pointing down", () => {
    // Real example from docs/performance.md: ~33% lower average latency.
    expect(describeImprovement(33.4, false)).toEqual({
      improved: true,
      direction: "down",
    });
  });

  it("treats a negative latencyImprovementPct as regressed, arrow pointing up", () => {
    expect(describeImprovement(-12.5, false)).toEqual({
      improved: false,
      direction: "up",
    });
  });

  it("treats a positive throughputImprovementPct as improved, arrow pointing up", () => {
    // Real example from docs/performance.md: ~50% higher throughput.
    expect(describeImprovement(49.8, true)).toEqual({
      improved: true,
      direction: "up",
    });
  });

  it("treats a negative throughputImprovementPct as regressed, arrow pointing down", () => {
    expect(describeImprovement(-5, true)).toEqual({
      improved: false,
      direction: "down",
    });
  });

  it("treats exactly zero as not improved", () => {
    expect(describeImprovement(0, true).improved).toBe(false);
    expect(describeImprovement(0, false).improved).toBe(false);
  });
});
