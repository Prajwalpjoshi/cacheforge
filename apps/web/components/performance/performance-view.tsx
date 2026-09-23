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
import { getErrorMessage } from "@/lib/api/error-message";
import { useRunBenchmark } from "@/lib/hooks/use-benchmarks";
import { BenchmarkForm } from "./benchmark-form";
import { BenchmarkSummaryStrip } from "./benchmark-summary-strip";
import { BenchmarkHistoryPanel } from "./benchmark-history-panel";
import { BenchmarkDetailSheet } from "./benchmark-detail-sheet";

export function PerformanceView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const runMutation = useRunBenchmark();

  function handleSubmit(input: BenchmarkRunRequest) {
    // Opens the same real detail view a History row's "View" button
    // opens, immediately populated with this run's result — no separate
    // inline "Result" card duplicating that UI.
    runMutation.mutate(input, {
      onSuccess: (result) => setSelectedId(result.data.id),
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Performance Lab
        </h1>
        <p className="max-w-2xl text-sm text-muted">
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

      <BenchmarkSummaryStrip />

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Recent benchmark runs and results.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <BenchmarkHistoryPanel onSelect={setSelectedId} />
        </CardContent>
      </Card>

      <BenchmarkDetailSheet
        id={selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
