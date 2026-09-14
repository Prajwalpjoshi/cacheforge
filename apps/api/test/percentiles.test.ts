import { describe, expect, it } from "vitest";
import {
  calculateLatencyStats,
  calculateThroughputRps,
  percentile,
} from "../src/benchmark/percentiles.js";

describe("percentile (nearest-rank)", () => {
  it("returns 0 for an empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("returns the only value for a single-sample array at any percentile", () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 95)).toBe(42);
    expect(percentile([42], 99)).toBe(42);
  });

  it("matches the spec formula for a 2-sample array: rank = ceil(p/100 * n)", () => {
    const sorted = [10, 20];
    // p50: ceil(0.5*2)=1 -> index 0 -> 10
    expect(percentile(sorted, 50)).toBe(10);
    // p95: ceil(0.95*2)=ceil(1.9)=2 -> index 1 -> 20
    expect(percentile(sorted, 95)).toBe(20);
    // p99: ceil(0.99*2)=2 -> index 1 -> 20
    expect(percentile(sorted, 99)).toBe(20);
  });

  it("matches the spec formula for a 10-sample array", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // p50: ceil(5)=5 -> index 4 -> 5
    expect(percentile(sorted, 50)).toBe(5);
    // p95: ceil(9.5)=10 -> index 9 -> 10 (the max, for exactly 10 samples)
    expect(percentile(sorted, 95)).toBe(10);
    // p99: ceil(9.9)=10 -> index 9 -> 10
    expect(percentile(sorted, 99)).toBe(10);
  });

  it("matches the spec formula for a 100-sample array", () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    // p50: ceil(50)=50 -> index 49 -> 50
    expect(percentile(sorted, 50)).toBe(50);
    // p95: ceil(95)=95 -> index 94 -> 95
    expect(percentile(sorted, 95)).toBe(95);
    // p99: ceil(99)=99 -> index 98 -> 99
    expect(percentile(sorted, 99)).toBe(99);
  });

  it("returns the repeated value for identical samples", () => {
    const sorted = [5, 5, 5, 5, 5];
    expect(percentile(sorted, 50)).toBe(5);
    expect(percentile(sorted, 95)).toBe(5);
    expect(percentile(sorted, 99)).toBe(5);
  });
});

describe("calculateLatencyStats", () => {
  it("returns all zeros for an empty array (not an error)", () => {
    expect(calculateLatencyStats([])).toEqual({
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
    });
  });

  it("computes correct stats for a single value", () => {
    expect(calculateLatencyStats([42])).toEqual({
      minMs: 42,
      maxMs: 42,
      avgMs: 42,
      p50Ms: 42,
      p95Ms: 42,
      p99Ms: 42,
    });
  });

  it("sorts internally so input order does not matter", () => {
    const unsorted = [30, 10, 20];
    const stats = calculateLatencyStats(unsorted);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(30);
    expect(stats.avgMs).toBe(20);
  });

  it("computes correct min/max/avg/percentiles for 10 samples", () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = calculateLatencyStats(samples);
    expect(stats.minMs).toBe(1);
    expect(stats.maxMs).toBe(10);
    expect(stats.avgMs).toBe(5.5);
    expect(stats.p50Ms).toBe(5);
    expect(stats.p95Ms).toBe(10);
    expect(stats.p99Ms).toBe(10);
  });

  it("computes correct stats for 100 samples", () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    const stats = calculateLatencyStats(samples);
    expect(stats.minMs).toBe(1);
    expect(stats.maxMs).toBe(100);
    expect(stats.avgMs).toBeCloseTo(50.5);
    expect(stats.p50Ms).toBe(50);
    expect(stats.p95Ms).toBe(95);
    expect(stats.p99Ms).toBe(99);
  });

  it("handles repeated identical values", () => {
    const stats = calculateLatencyStats([7, 7, 7, 7]);
    expect(stats).toEqual({
      minMs: 7,
      maxMs: 7,
      avgMs: 7,
      p50Ms: 7,
      p95Ms: 7,
      p99Ms: 7,
    });
  });
});

describe("calculateThroughputRps", () => {
  it("divides iterations by total wall-clock seconds", () => {
    expect(calculateThroughputRps(100, 2)).toBe(50);
  });

  it("returns 0 rather than Infinity/NaN when elapsed time is zero", () => {
    expect(calculateThroughputRps(100, 0)).toBe(0);
  });

  it("returns 0 for negative elapsed time (defensive)", () => {
    expect(calculateThroughputRps(100, -1)).toBe(0);
  });

  it("is not the average of individual latencies", () => {
    // 10 iterations at 10ms each, but run with concurrency so the whole
    // batch takes only 20ms wall-clock (not 100ms) -> throughput should
    // reflect the wall-clock time, not sum/avg of the individual samples.
    const throughput = calculateThroughputRps(10, 0.02);
    expect(throughput).toBe(500);
  });
});
