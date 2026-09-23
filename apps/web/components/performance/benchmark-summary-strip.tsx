"use client";

import { BarChart3, Clock, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBenchmarkSummary } from "@/lib/hooks/use-benchmarks";
import {
  formatClockTime,
  formatInteger,
  formatRelativeTime,
  formatThroughput,
} from "@/lib/format";

/**
 * Every value here is sourced from a real, unfiltered
 * `GET /api/benchmarks?page=1&pageSize=1` fetch: `total` is the persisted
 * BenchmarkRun count, and the single returned item is the newest run.
 * Throughput is deliberately shown per-run ("Latest throughput") rather
 * than averaged across history — DB_ONLY, CACHE_ONLY, and COMPARISON runs
 * measure fundamentally different things (raw Postgres reads vs. the
 * Redis-backed cache-aside path), so averaging their throughputRps
 * together would mix incompatible populations into a misleading number.
 */
export function BenchmarkSummaryStrip() {
  const summaryQuery = useBenchmarkSummary();
  const loading = summaryQuery.isPending;
  const response = summaryQuery.data?.data;
  const latest = response?.items[0];

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-4 sm:flex-row sm:items-center sm:gap-10">
        <SummaryStat
          icon={BarChart3}
          label="Total runs"
          loading={loading}
          value={response ? formatInteger(response.total) : "—"}
          caption="benchmark runs"
        />
        <SummaryStat
          icon={Clock}
          label="Latest run"
          loading={loading}
          value={latest ? formatClockTime(latest.createdAt) : "No runs yet"}
          caption={latest ? formatRelativeTime(latest.createdAt) : undefined}
        />
        <SummaryStat
          icon={Zap}
          label="Latest throughput"
          loading={loading}
          value={latest ? formatThroughput(latest.throughputRps) : "—"}
          caption={latest ? "on the most recent run" : undefined}
        />
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  caption,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted">{label}</span>
        {loading ? (
          <Skeleton className="mt-0.5 h-5 w-20" />
        ) : (
          <span className="font-mono text-base font-semibold tabular-nums text-foreground">
            {value}
          </span>
        )}
        {!loading && caption && (
          <span className="text-xs text-muted-foreground">{caption}</span>
        )}
      </div>
    </div>
  );
}
