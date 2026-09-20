"use client";

import { useState } from "react";
import type { BenchmarkRunRequest } from "@cacheforge/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  useBenchmarkHistory,
  useRunBenchmark,
} from "@/lib/hooks/use-benchmarks";
import { getErrorMessage } from "@/lib/api/error-message";
import { BenchmarkForm } from "./benchmark-form";
import { BenchmarkResultPanel } from "./benchmark-result-panel";
import { BenchmarkHistoryTable } from "./benchmark-history-table";
import { BenchmarkDetailSheet } from "./benchmark-detail-sheet";
import { Methodology } from "./methodology";

export function PerformanceView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const historyQuery = useBenchmarkHistory();
  const runMutation = useRunBenchmark();

  function handleSubmit(input: BenchmarkRunRequest) {
    runMutation.mutate(input);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Performance Lab
        </h1>
        <p className="text-sm text-muted">
          Run real, in-process benchmarks comparing PostgreSQL and the
          Redis-backed cache-aside path.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run a benchmark</CardTitle>
          <CardDescription>
            Configure the target endpoint, mode, and load, then run it against
            this instance&apos;s real Postgres and Redis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BenchmarkForm
            onSubmit={handleSubmit}
            submitting={runMutation.isPending}
            submitError={
              runMutation.isError ? getErrorMessage(runMutation.error) : null
            }
          />
        </CardContent>
      </Card>

      {runMutation.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkResultPanel run={runMutation.data.data} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isPending ? (
            <div className="p-5">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : historyQuery.isError ? (
            <div className="p-5">
              <ErrorState
                message="Unable to load benchmark history."
                onRetry={() => void historyQuery.refetch()}
              />
            </div>
          ) : (
            <BenchmarkHistoryTable
              runs={historyQuery.data.data}
              onSelect={setSelectedId}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <Methodology />
        </CardContent>
      </Card>

      <BenchmarkDetailSheet
        id={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
