"use client";

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RequestMetricDTO } from "@cacheforge/contracts";
import { EmptyState } from "@/components/ui/empty-state";
import { describeCacheStatus, TONE_CSS_VAR } from "@/lib/status";
import { formatClockTime, formatMs } from "@/lib/format";

const STATUSES = ["HIT", "MISS", "BYPASS", "NOT_APPLICABLE"] as const;

/**
 * Individual request latencies plotted in request order — real
 * per-request data from GET /api/metrics/requests (newest-first from
 * the API, reversed here to read left-to-right chronologically),
 * never averaged or synthesized. PROJECT_SPEC.md #8/#18.
 */
export function LatencyScatterChart({
  requests,
}: {
  requests: RequestMetricDTO[];
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No request data yet"
        description="Real traffic will populate this chart as requests come in."
      />
    );
  }

  const chronological = [...requests].reverse();
  const series = STATUSES.map((status) => ({
    status,
    descriptor: describeCacheStatus(status),
    points: chronological
      .map((request, index) => ({ index, request }))
      .filter(({ request }) => request.cacheStatus === status)
      .map(({ index, request }) => ({
        index,
        durationMs: request.durationMs,
        route: request.route,
        method: request.method,
        createdAt: request.createdAt,
      })),
  })).filter((s) => s.points.length > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="index"
          type="number"
          tick={{ fontSize: 11, fill: "var(--color-muted)" }}
          label={{
            value: "request order (oldest → newest)",
            position: "insideBottom",
            offset: -4,
            fontSize: 11,
            fill: "var(--color-muted)",
          }}
        />
        <YAxis
          dataKey="durationMs"
          type="number"
          tick={{ fontSize: 11, fill: "var(--color-muted)" }}
          label={{
            value: "ms",
            angle: -90,
            position: "insideLeft",
            fontSize: 11,
            fill: "var(--color-muted)",
          }}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, name, item) => {
            const payload = item.payload as {
              method: string;
              route: string;
              createdAt: string;
            };
            return [
              `${formatMs(value as number)} · ${payload.method} ${payload.route} · ${formatClockTime(payload.createdAt)}`,
              "",
            ];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Scatter
            key={s.status}
            name={s.descriptor.label}
            data={s.points}
            fill={TONE_CSS_VAR[s.descriptor.tone]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
