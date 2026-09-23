"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, ListChecks, RefreshCw } from "lucide-react";
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
import { LatencyTrendChart } from "./latency-trend-chart";
import { RecentRequestsPanel } from "./recent-requests-panel";

/** Unfiltered "most recent N" fetch backing only the latency chart — independent of whatever page/filters the Recent Requests table below is showing (see RecentRequestsPanel). */
const CHART_REQUEST_SAMPLE_SIZE = 100;

export function DashboardView() {
  const [windowMinutes, setWindowMinutes] = useState(15);
  const queryClient = useQueryClient();

  const summaryQuery = useMetricsSummary(windowMinutes);
  const chartRequestsQuery = useRequestMetrics({
    pageSize: CHART_REQUEST_SAMPLE_SIZE,
  });
  const healthQuery = useHealth();

  const isLoading = summaryQuery.isPending || chartRequestsQuery.isPending;
  const lastUpdated = summaryQuery.dataUpdatedAt
    ? new Date(summaryQuery.dataUpdatedAt).toISOString()
    : null;

  const hasRouteData =
    !summaryQuery.isPending &&
    !summaryQuery.isError &&
    summaryQuery.data.data.byRoute.length > 0;
  const chartRequests = chartRequestsQuery.data?.data.items ?? [];
  const hasRequestData =
    !chartRequestsQuery.isPending &&
    !chartRequestsQuery.isError &&
    chartRequests.length > 0;

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ["metrics"] });
    void healthQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted">
            Live visibility into API performance, cache behavior, and system
            health.
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated {formatRelativeTime(lastUpdated)}
            </p>
          )}
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
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="inline-flex items-center gap-1.5">
              <BarChart3 aria-hidden="true" className="size-4 text-accent" />
              Requests by route
            </CardTitle>
            {hasRouteData && (
              <span className="text-xs text-muted">Top 5 routes</span>
            )}
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
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="inline-flex items-center gap-1.5">
              <Activity aria-hidden="true" className="size-4 text-accent" />
              Recent latency by cache status
            </CardTitle>
            {hasRequestData && (
              <span className="text-xs text-muted">
                Last {chartRequests.length} requests
              </span>
            )}
          </CardHeader>
          <CardContent>
            {chartRequestsQuery.isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : chartRequestsQuery.isError ? (
              <ErrorState
                message="Unable to load recent requests."
                onRetry={() => void chartRequestsQuery.refetch()}
              />
            ) : (
              <LatencyTrendChart requests={chartRequests} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="inline-flex items-center gap-1.5">
            <ListChecks aria-hidden="true" className="size-4 text-accent" />
            Recent requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RecentRequestsPanel windowMinutes={windowMinutes} />
        </CardContent>
      </Card>
    </div>
  );
}
