import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "../src/health.js";

describe("healthResponseSchema", () => {
  it("accepts a valid ok response", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      uptimeSec: 12.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid degraded response", () => {
    const result = healthResponseSchema.safeParse({
      status: "degraded",
      uptimeSec: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status value", () => {
    const result = healthResponseSchema.safeParse({
      status: "unknown",
      uptimeSec: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative uptime", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      uptimeSec: -1,
    });
    expect(result.success).toBe(false);
  });
});
