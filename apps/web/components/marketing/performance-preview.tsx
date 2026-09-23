"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listBenchmarks } from "@/lib/api/benchmarks";
import { queryKeys } from "@/lib/query-keys";
import { formatMs, formatPercent } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/**
 * PROJECT_SPEC.md #7: "Do not place fixed benchmark values into the
 * page... If there are no results, explain the methodology instead of
 * fabricating results." This fetches the most recent real COMPARISON
 * run and renders it; with none available, falls through to a
 * methodology-only explanation — never placeholder numbers.
 */
export function PerformancePreview() {
  const query = { pageSize: 20 };
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.benchmarks(query),
    queryFn: () => listBenchmarks(query),
  });

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const comparisonRun = !isError
    ? data?.data.items.find((run) => run.mode === "COMPARISON")
    : undefined;

  if (!comparisonRun) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-foreground">
          No benchmark has been run on this instance yet.
        </p>
        <p className="text-sm text-muted">
          The Performance Lab measures the exact same repository call
          (database-only) against the exact same service-layer cache-aside call
          (Redis-backed) used by the real product API, timed with{" "}
          <code className="font-mono text-xs">process.hrtime.bigint()</code> and
          reported as P50/P95/P99 latency and throughput — a real, reproducible
          local measurement, not a marketing number.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/performance">Run a benchmark</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PreviewTile
          label="Avg latency (cached)"
          value={formatMs(comparisonRun.avgMs)}
        />
        <PreviewTile
          label="P95 latency (cached)"
          value={formatMs(comparisonRun.p95Ms)}
        />
        <PreviewTile
          label="Cache hit rate"
          value={formatPercent(comparisonRun.cacheHitRate)}
        />
        <PreviewTile
          label="Throughput"
          value={`${Math.round(comparisonRun.throughputRps)} req/s`}
        />
      </div>
      <p className="text-xs text-muted">
        From the most recent comparison run on this instance (
        {comparisonRun.iterations} iterations, concurrency{" "}
        {comparisonRun.concurrency}). See the Performance Lab for full
        methodology and history.
      </p>
      <Button asChild variant="secondary" size="sm">
        <Link href="/performance">Open Performance Lab</Link>
      </Button>
    </div>
  );
}

function PreviewTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
