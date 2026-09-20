"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useBenchmarkDetail } from "@/lib/hooks/use-benchmarks";
import { BenchmarkResultPanel } from "./benchmark-result-panel";
import { LatencyDistributionChart } from "./latency-distribution-chart";

export function BenchmarkDetailSheet({
  id,
  onOpenChange,
}: {
  id: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const detailQuery = useBenchmarkDetail(id);

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        title="Benchmark run"
        description={id ?? undefined}
      >
        {detailQuery.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : detailQuery.isError ? (
          <ErrorState
            message="Unable to load this benchmark run."
            onRetry={() => void detailQuery.refetch()}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <BenchmarkResultPanel run={detailQuery.data.data} />
            {detailQuery.data.data.latenciesMs && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Latency distribution (sorted samples)
                </h3>
                <LatencyDistributionChart
                  latenciesMs={detailQuery.data.data.latenciesMs}
                />
              </div>
            )}
            {detailQuery.data.data.comparison && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    DB_ONLY distribution
                  </h3>
                  <LatencyDistributionChart
                    latenciesMs={
                      detailQuery.data.data.comparison.dbOnly.latenciesMs
                    }
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    CACHE_ONLY distribution
                  </h3>
                  <LatencyDistributionChart
                    latenciesMs={
                      detailQuery.data.data.comparison.cacheOnly.latenciesMs
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
