import { describe, expect, it } from "vitest";
import {
  deriveDurationMs,
  formatInteger,
  formatMs,
  formatPercent,
  formatRelativeTime,
  formatSignedPercent,
  formatThroughput,
} from "./format";

describe("formatMs", () => {
  it("shows two decimals under 10ms", () => {
    expect(formatMs(1.9042)).toBe("1.90 ms");
  });

  it("shows one decimal between 10 and 100ms", () => {
    expect(formatMs(54.28)).toBe("54.3 ms");
  });

  it("rounds to a whole number at or above 100ms", () => {
    expect(formatMs(231.78)).toBe("232 ms");
  });

  it("renders an em dash for missing values", () => {
    expect(formatMs(null)).toBe("—");
    expect(formatMs(undefined)).toBe("—");
    expect(formatMs(Number.NaN)).toBe("—");
  });
});

describe("formatPercent / formatSignedPercent", () => {
  it("converts a 0-1 ratio to a percentage string", () => {
    expect(formatPercent(0.9667)).toBe("96.7%");
  });

  it("signs positive and negative deltas explicitly", () => {
    expect(formatSignedPercent(33.4)).toBe("+33.4%");
    expect(formatSignedPercent(-12.5)).toBe("-12.5%");
    expect(formatSignedPercent(0)).toBe("0.0%");
  });
});

describe("formatInteger", () => {
  it("adds thousands separators", () => {
    expect(formatInteger(12345)).toBe("12,345");
  });
});

describe("formatThroughput", () => {
  it("shows one decimal below 10 req/s and whole numbers above", () => {
    expect(formatThroughput(3.456)).toBe("3.5 req/s");
    expect(formatThroughput(393.2)).toBe("393 req/s");
  });
});

describe("deriveDurationMs", () => {
  it("derives wall-clock duration from iterations and throughput", () => {
    // 30 iterations at 393 req/s really took ~76.3ms wall clock.
    expect(deriveDurationMs(30, 393)).toBeCloseTo(76.3, 1);
  });

  it("returns null instead of Infinity when throughput is zero", () => {
    expect(deriveDurationMs(30, 0)).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");

  it("says 'just now' for sub-5-second gaps", () => {
    expect(formatRelativeTime("2026-09-20T11:59:58.000Z", now)).toBe(
      "just now",
    );
  });

  it("formats seconds, minutes, hours, and days appropriately", () => {
    expect(formatRelativeTime("2026-09-20T11:59:30.000Z", now)).toBe("30s ago");
    expect(formatRelativeTime("2026-09-20T11:55:00.000Z", now)).toBe("5m ago");
    expect(formatRelativeTime("2026-09-20T09:00:00.000Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-09-18T12:00:00.000Z", now)).toBe("2d ago");
  });
});
