import { describe, expect, it } from "vitest";
import {
  describeCacheStatus,
  describeHttpStatus,
  describeOverallHealth,
  describeServiceStatus,
} from "./status";

describe("describeCacheStatus", () => {
  it("maps HIT to the success tone", () => {
    expect(describeCacheStatus("HIT")).toMatchObject({
      label: "HIT",
      tone: "success",
    });
  });

  it("maps MISS to the warning tone", () => {
    expect(describeCacheStatus("MISS")).toMatchObject({
      label: "MISS",
      tone: "warning",
    });
  });

  it("maps BYPASS to the neutral tone, distinct from a miss", () => {
    const bypass = describeCacheStatus("BYPASS");
    const miss = describeCacheStatus("MISS");
    expect(bypass.tone).toBe("neutral");
    expect(bypass.tone).not.toBe(miss.tone);
  });
});

describe("describeServiceStatus", () => {
  it("maps up/down to success/danger", () => {
    expect(describeServiceStatus("up").tone).toBe("success");
    expect(describeServiceStatus("down").tone).toBe("danger");
  });
});

describe("describeOverallHealth", () => {
  it("distinguishes ok, degraded, and down with three different tones", () => {
    const tones = new Set(
      (["ok", "degraded", "down"] as const).map(
        (status) => describeOverallHealth(status).tone,
      ),
    );
    expect(tones.size).toBe(3);
  });
});

describe("describeHttpStatus", () => {
  it("buckets status codes into success/warning/danger", () => {
    expect(describeHttpStatus(200).tone).toBe("success");
    expect(describeHttpStatus(201).tone).toBe("success");
    expect(describeHttpStatus(404).tone).toBe("warning");
    expect(describeHttpStatus(429).tone).toBe("warning");
    expect(describeHttpStatus(500).tone).toBe("danger");
    expect(describeHttpStatus(503).tone).toBe("danger");
  });
});
