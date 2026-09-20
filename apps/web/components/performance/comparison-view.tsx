import { ArrowDown, ArrowUp } from "lucide-react";
import type { BenchmarkComparison } from "@cacheforge/contracts";
import { StatsGrid } from "./stats-grid";
import { formatSignedPercent } from "@/lib/format";
import { describeImprovement } from "@/lib/benchmark-presentation";
import { cn } from "@/lib/utils";

function ImprovementBadge({
  label,
  pct,
  higherIsBetter,
}: {
  label: string;
  pct: number | null;
  higherIsBetter: boolean;
}) {
  if (pct === null) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-muted">n/a</span>
      </div>
    );
  }

  const { improved, direction } = describeImprovement(pct, higherIsBetter);
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1 font-mono font-semibold tabular-nums",
          improved ? "text-status-hit" : "text-status-down",
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {formatSignedPercent(Math.abs(pct))}
      </span>
    </div>
  );
}

/** Renders exactly what POST /api/benchmarks/run returned for a COMPARISON — the improvement percentages are the backend's own (before-after)/before*100 computation, not recomputed here. */
export function ComparisonView({
  comparison,
  iterations,
  concurrency,
}: {
  comparison: BenchmarkComparison;
  iterations: number;
  concurrency: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ImprovementBadge
          label="Avg latency"
          pct={comparison.latencyImprovementPct}
          higherIsBetter={false}
        />
        <ImprovementBadge
          label="P95 latency"
          pct={comparison.p95ImprovementPct}
          higherIsBetter={false}
        />
        <ImprovementBadge
          label="Throughput"
          pct={comparison.throughputImprovementPct}
          higherIsBetter
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
            DB_ONLY
          </h3>
          <StatsGrid
            stats={{
              ...comparison.dbOnly.stats,
              cacheHitRate: comparison.dbOnly.cacheHitRate,
            }}
            iterations={iterations}
            concurrency={concurrency}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
            CACHE_ONLY
          </h3>
          <StatsGrid
            stats={{
              ...comparison.cacheOnly.stats,
              cacheHitRate: comparison.cacheOnly.cacheHitRate,
            }}
            iterations={iterations}
            concurrency={concurrency}
          />
        </div>
      </div>
    </div>
  );
}
