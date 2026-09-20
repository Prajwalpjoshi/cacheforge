import type { BenchmarkRunDetail } from "@cacheforge/contracts";
import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "./stats-grid";
import { ComparisonView } from "./comparison-view";
import { formatClockTime } from "@/lib/format";

export function BenchmarkResultPanel({ run }: { run: BenchmarkRunDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="accent">{run.mode}</Badge>
        <span className="font-mono text-muted">{run.targetRoute}</span>
        {run.label && <span className="text-muted">— {run.label}</span>}
        <span className="ml-auto text-xs text-muted">
          {formatClockTime(run.createdAt)}
        </span>
      </div>

      {run.mode === "COMPARISON" && run.comparison ? (
        <ComparisonView
          comparison={run.comparison}
          iterations={run.iterations}
          concurrency={run.concurrency}
        />
      ) : (
        <StatsGrid
          stats={run}
          iterations={run.iterations}
          concurrency={run.concurrency}
        />
      )}
    </div>
  );
}
