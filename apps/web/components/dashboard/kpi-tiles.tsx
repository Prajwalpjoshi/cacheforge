import type { ReactNode } from "react";
import type {
  HealthResponse,
  MetricsSummaryResponse,
} from "@cacheforge/contracts";
import {
  AlertTriangle,
  BarChart3,
  Database,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger, formatMs, formatPercent } from "@/lib/format";
import { describeServiceStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Real, human-readable framing for the selected metrics window — never a fabricated comparison like "+12% vs previous period", since the summary API doesn't return prior-period data to compare against. */
const WINDOW_LABELS: Record<number, string> = {
  15: "Last 15 minutes",
  60: "Last hour",
  1440: "Last 24 hours",
  10080: "Last 7 days",
};

function windowHint(windowMinutes: number | undefined): string | undefined {
  if (windowMinutes === undefined) return undefined;
  return WINDOW_LABELS[windowMinutes] ?? `Last ${windowMinutes}m`;
}

export function KpiTiles({
  summary,
  health,
  loading,
}: {
  summary: MetricsSummaryResponse | undefined;
  health: HealthResponse | undefined;
  loading: boolean;
}) {
  const hint = windowHint(summary?.windowMinutes);
  const hasErrors = (summary?.errorRate ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        icon={BarChart3}
        label="Requests"
        loading={loading}
        value={formatInteger(summary?.requestCount)}
        hint={hint}
      />
      <MetricCard
        icon={Database}
        label="Cache hit rate"
        loading={loading}
        value={formatPercent(summary?.cacheHitRate)}
        valueClassName="text-status-hit"
        hint={
          summary?.cacheHitRate === null ? "No cacheable traffic yet" : hint
        }
      />
      <MetricCard
        icon={AlertTriangle}
        label="Error rate"
        loading={loading}
        value={formatPercent(summary?.errorRate)}
        valueClassName={hasErrors ? "text-status-down" : undefined}
        hint={hint}
      />
      <MetricCard
        icon={Timer}
        label="P50 / P95 / P99"
        loading={loading}
        valueClassName="text-lg sm:text-xl"
        value={
          summary
            ? `${formatMs(summary.p50Ms)} / ${formatMs(summary.p95Ms)} / ${formatMs(summary.p99Ms)}`
            : "—"
        }
        hint={hint}
      />
      <ServiceCard label="PostgreSQL" status={health?.postgres} />
      <ServiceCard label="Redis" status={health?.redis} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <span
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums text-foreground",
            valueClassName,
          )}
        >
          {value}
        </span>
      )}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

function ServiceCard({
  label,
  status,
}: {
  label: string;
  status: "up" | "down" | undefined;
}) {
  const descriptor = status ? describeServiceStatus(status) : undefined;
  const dotClass =
    status === "up"
      ? "bg-status-hit"
      : status === "down"
        ? "bg-status-down"
        : "bg-status-neutral";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Database aria-hidden="true" className="size-3.5" />
        {label}
      </div>
      {status ? (
        <span className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", dotClass)}
          />
          {descriptor?.label}
        </span>
      ) : (
        <Skeleton className="h-7 w-16" />
      )}
    </div>
  );
}
