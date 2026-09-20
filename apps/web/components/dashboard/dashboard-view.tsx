"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth } from "@/lib/hooks/use-health";
import { useMetricsSummary } from "@/lib/hooks/use-metrics-summary";
import { useRequestMetrics } from "@/lib/hooks/use-request-metrics";
import { formatRelativeTime } from "@/lib/format";
import { TimeWindowSelector } from "./time-window-selector";
import { KpiTiles } from "./kpi-tiles";
import { RequestVolumeChart } from "./request-volume-chart";
import { LatencyScatterChart } from "./latency-scatter-chart";
import { RecentRequestsTable } from "./recent-requests-table";

const REQUEST_LIMIT = 100;

export function DashboardView() {
  const [windowMinutes, setWindowMinutes] = useState(15);

  const summaryQuery = useMetricsSummary(windowMinutes);
  const requestsQuery = useRequestMetrics(REQUEST_LIMIT);
  const healthQuery = useHealth();

  const isLoading = summaryQuery.isPending || requestsQuery.isPending;
  const lastUpdated = summaryQuery.dataUpdatedAt
    ? new Date(summaryQuery.dataUpdatedAt).toISOString()
    : null;

  function refreshAll() {
    void summaryQuery.refetch();
    void requestsQuery.refetch();
    void healthQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted">
            Live visibility into API performance, cache behavior, and system
            health.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeWindowSelector
            value={windowMinutes}
            onChange={setWindowMinutes}
          />
          <Button variant="secondary" size="sm" onClick={refreshAll}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="-mt-4 text-xs text-muted">
          Last updated {formatRelativeTime(lastUpdated)}
        </p>
      )}

      {summaryQuery.isError ? (
        <ErrorState
          message="Unable to load metrics summary."
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <KpiTiles
          summary={summaryQuery.data?.data}
          health={healthQuery.data?.data}
          loading={isLoading}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Requests by route</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQuery.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : summaryQuery.isError ? (
              <ErrorState
                message="Unable to load route breakdown."
                onRetry={() => void summaryQuery.refetch()}
              />
            ) : (
              <RequestVolumeChart byRoute={summaryQuery.data.data.byRoute} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent latency by cache status</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsQuery.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : requestsQuery.isError ? (
              <ErrorState
                message="Unable to load recent requests."
                onRetry={() => void requestsQuery.refetch()}
              />
            ) : (
              <LatencyScatterChart requests={requestsQuery.data.data} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requestsQuery.isPending ? (
            <div className="p-5">
              <Skeleton className="h-48 w-full" />
            </div>
          ) : requestsQuery.isError ? (
            <div className="p-5">
              <ErrorState
                message="Unable to load recent requests."
                onRetry={() => void requestsQuery.refetch()}
              />
            </div>
          ) : (
            <RecentRequestsTable requests={requestsQuery.data.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
