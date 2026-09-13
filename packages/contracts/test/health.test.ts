import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "../src/health.js";

describe("healthResponseSchema", () => {
  it("accepts a valid ok response", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      postgres: "up",
      redis: "up",
      uptimeSec: 12.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a degraded response with redis down", () => {
    const result = healthResponseSchema.safeParse({
      status: "degraded",
      postgres: "up",
      redis: "down",
      uptimeSec: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status value", () => {
    const result = healthResponseSchema.safeParse({
      status: "unknown",
      postgres: "up",
      redis: "up",
      uptimeSec: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown postgres value", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      postgres: "unknown",
      redis: "up",
      uptimeSec: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative uptime", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      postgres: "up",
      redis: "up",
      uptimeSec: -1,
    });
    expect(result.success).toBe(false);
  });
});
