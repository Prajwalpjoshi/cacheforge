import { StatTile } from "@/components/ui/stat-tile";
import {
  deriveDurationMs,
  formatMs,
  formatPercent,
  formatThroughput,
} from "@/lib/format";

export interface BenchmarkStatsLike {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughputRps: number;
  cacheHitRate: number | null;
}

/** Renders exactly the fields the backend actually returns — plus a wall-clock duration derived from iterations/throughput (arithmetic on real numbers, not a new measurement). */
export function StatsGrid({
  stats,
  iterations,
  concurrency,
}: {
  stats: BenchmarkStatsLike;
  iterations: number;
  concurrency: number;
}) {
  const durationMs = deriveDurationMs(iterations, stats.throughputRps);

  return (
    // @sm/@lg (container query, not viewport) so column count tracks
    // this grid's own rendered width — full drawer width in single-run
    // mode, roughly half of it side-by-side in COMPARISON mode (see the
    // @container wrappers in benchmark-result-panel.tsx / comparison-view.tsx).
    <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3 @lg:grid-cols-4">
      <StatTile label="Min" value={formatMs(stats.minMs)} />
      <StatTile label="Avg" value={formatMs(stats.avgMs)} />
      <StatTile label="P50" value={formatMs(stats.p50Ms)} />
      <StatTile label="P95" value={formatMs(stats.p95Ms)} />
      <StatTile label="P99" value={formatMs(stats.p99Ms)} />
      <StatTile
        label="Throughput"
        value={formatThroughput(stats.throughputRps)}
      />
      <StatTile
        label="Cache hit rate"
        value={
          stats.cacheHitRate === null
            ? "n/a"
            : formatPercent(stats.cacheHitRate)
        }
      />
      <StatTile
        label="Iterations / concurrency"
        value={`${iterations} / ${concurrency}`}
        hint={
          durationMs !== null
            ? `~${formatMs(durationMs)} wall clock`
            : undefined
        }
      />
    </div>
  );
}
