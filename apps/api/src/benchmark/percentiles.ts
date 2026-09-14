export interface LatencyStats {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

/**
 * Nearest-rank method, exactly as specified in PROJECT_SPEC.md §11:
 * for percentile `p` (0-100) over `n` sorted samples,
 * `index = ceil(p / 100 * n) - 1`, clamped into range. This always
 * returns an actual observed sample (never an interpolated value
 * between two samples), which is what makes it reproducible and
 * auditable from the raw latency array alone.
 *
 * `sortedAscending` must already be sorted ascending; this function
 * does not sort defensively so callers doing this once for several
 * percentiles don't pay for it repeatedly.
 */
export function percentile(sortedAscending: number[], p: number): number {
  const n = sortedAscending.length;
  if (n === 0) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * n);
  const index = Math.min(Math.max(rank - 1, 0), n - 1);
  // Safe: index is clamped to [0, n-1] and n > 0 was just checked above.
  return sortedAscending[index] ?? 0;
}

/**
 * Computes min/max/avg/p50/p95/p99 from a (not-necessarily-sorted)
 * array of millisecond latencies. Returns all zeros for an empty
 * array rather than throwing — an empty benchmark result is a valid,
 * honest "nothing was measured" state, not an error.
 */
export function calculateLatencyStats(latenciesMs: number[]): LatencyStats {
  if (latenciesMs.length === 0) {
    return { minMs: 0, maxMs: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0 };
  }

  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);

  return {
    // Safe: `sorted` is non-empty here (the length === 0 case returned above).
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
    avgMs: sum / sorted.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
  };
}

/**
 * `iterations / totalWallClockSeconds` — measured with a single
 * high-resolution timer wrapped around the *entire* workload
 * (including concurrency), never derived from averaging individual
 * latencies. Ten requests that took 10ms each running fully in
 * parallel finish in ~10ms of wall-clock time, not 100ms — throughput
 * must reflect that, which per-request-duration averaging cannot.
 */
export function calculateThroughputRps(
  iterations: number,
  totalWallClockSeconds: number,
): number {
  if (totalWallClockSeconds <= 0) {
    return 0;
  }
  return iterations / totalWallClockSeconds;
}
