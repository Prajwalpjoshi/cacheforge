"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth } from "@/lib/hooks/use-health";
import { getErrorMessage } from "@/lib/api/error-message";
import { formatMs, formatRelativeTime } from "@/lib/format";
import {
  describeOverallHealth,
  describeServiceStatus,
  type OverallHealth,
} from "@/lib/status";

export function HealthView() {
  const query = useHealth(10_000);

  const health = query.data?.data;
  const apiReachable = !query.isError;
  // The API responds (sometimes with its own 503) whenever Postgres or
  // Redis is checked, so "API reachable" and "overall status" are
  // different questions — a totally unreachable API is the one case
  // neither service field can speak to.
  const overall: OverallHealth = query.isError
    ? "down"
    : (health?.status ?? "degraded");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            System Health
          </h1>
          <p className="text-sm text-muted">
            Real-time status of the API, PostgreSQL, and Redis, pinged directly
            by <code className="font-mono text-xs">GET /api/health</code>.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Recheck now
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4">
        <StatusBadge descriptor={describeOverallHealth(overall)} />
        <p className="text-sm text-muted">
          {overall === "ok" && "All systems operational."}
          {overall === "degraded" &&
            "PostgreSQL is up, but Redis is unreachable — reads are falling back to the database (fail-open)."}
          {overall === "down" &&
            (query.isError
              ? `The API itself is unreachable: ${getErrorMessage(query.error)}`
              : "PostgreSQL is unreachable — this is a hard outage, not a degraded state.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>API</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {query.isPending ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <StatusBadge
                descriptor={describeServiceStatus(apiReachable ? "up" : "down")}
              />
            )}
            <ServiceMeta query={query} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PostgreSQL</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {query.isPending ? (
              <Skeleton className="h-6 w-20" />
            ) : health ? (
              <StatusBadge
                descriptor={describeServiceStatus(health.postgres)}
              />
            ) : (
              <span className="text-sm text-muted">
                Unknown — API unreachable
              </span>
            )}
            <ServiceMeta query={query} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {query.isPending ? (
              <Skeleton className="h-6 w-20" />
            ) : health ? (
              <StatusBadge descriptor={describeServiceStatus(health.redis)} />
            ) : (
              <span className="text-sm text-muted">
                Unknown — API unreachable
              </span>
            )}
            <ServiceMeta query={query} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServiceMeta({ query }: { query: ReturnType<typeof useHealth> }) {
  return (
    <div className="text-xs text-muted">
      {query.dataUpdatedAt > 0 && (
        <p>
          Last checked{" "}
          {formatRelativeTime(new Date(query.dataUpdatedAt).toISOString())}
        </p>
      )}
      {query.data && <p>Response time: {formatMs(query.data.latencyMs)}</p>}
    </div>
  );
}
