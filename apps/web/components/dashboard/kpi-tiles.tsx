import type {
  HealthResponse,
  MetricsSummaryResponse,
} from "@cacheforge/contracts";
import { StatTile } from "@/components/ui/stat-tile";
import { formatInteger, formatMs, formatPercent } from "@/lib/format";
import { describeServiceStatus } from "@/lib/status";
import { StatusBadge } from "@/components/ui/status-badge";

export function KpiTiles({
  summary,
  health,
  loading,
}: {
  summary: MetricsSummaryResponse | undefined;
  health: HealthResponse | undefined;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile
        label="Requests"
        loading={loading}
        value={formatInteger(summary?.requestCount)}
      />
      <StatTile
        label="Cache hit rate"
        loading={loading}
        value={formatPercent(summary?.cacheHitRate)}
        hint={
          summary?.cacheHitRate === null
            ? "no cacheable traffic yet"
            : undefined
        }
      />
      <StatTile
        label="Error rate"
        loading={loading}
        value={formatPercent(summary?.errorRate)}
      />
      <StatTile
        label="P50 / P95 / P99"
        loading={loading}
        value={
          summary
            ? `${formatMs(summary.p50Ms)} / ${formatMs(summary.p95Ms)} / ${formatMs(summary.p99Ms)}`
            : "—"
        }
        className="col-span-2 lg:col-span-2"
      />
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          PostgreSQL
        </span>
        {health ? (
          <StatusBadge descriptor={describeServiceStatus(health.postgres)} />
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Redis
        </span>
        {health ? (
          <StatusBadge descriptor={describeServiceStatus(health.redis)} />
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </div>
    </div>
  );
}
