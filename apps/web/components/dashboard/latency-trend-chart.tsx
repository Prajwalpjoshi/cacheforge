"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CacheStatusValue, RequestMetricDTO } from "@cacheforge/contracts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatClockTime, formatMs } from "@/lib/format";

interface ChartPoint {
  timeMs: number;
  durationMs: number;
  method: string;
  route: string;
  createdAt: string;
}

const SERIES_DEFS: {
  key: string;
  label: string;
  colorVar: string;
  match: (status: CacheStatusValue) => boolean;
}[] = [
  {
    key: "hit",
    label: "HIT",
    colorVar: "var(--color-status-hit)",
    match: (status) => status === "HIT",
  },
  {
    key: "miss",
    label: "MISS",
    colorVar: "var(--color-status-miss)",
    match: (status) => status === "MISS",
  },
  {
    // Folds BYPASS in with NOT_APPLICABLE — both mean "not a hit/miss
    // result" for this trend view. Individual BYPASS requests are still
    // visible with their own label in the Recent requests table below.
    key: "na",
    label: "N/A",
    colorVar: "var(--color-status-neutral)",
    match: (status) => status === "NOT_APPLICABLE" || status === "BYPASS",
  },
];

function formatAxisTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Each recent request's real latency plotted against its real timestamp,
 * split into HIT/MISS/N/A lines — never bucketed, averaged, or
 * synthesized. Source: GET /api/metrics/requests (PROJECT_SPEC.md
 * #8/#18). Each line only connects the real points that exist for that
 * cache status, so a status with no traffic in a stretch of time simply
 * has no line there rather than an interpolated/misleading one.
 */
export function LatencyTrendChart({
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

  const chronological = [...requests].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const series = SERIES_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    color: def.colorVar,
    points: chronological
      .filter((request) => def.match(request.cacheStatus))
      .map((request): ChartPoint => ({
        timeMs: new Date(request.createdAt).getTime(),
        durationMs: request.durationMs,
        method: request.method,
        route: request.route,
        createdAt: request.createdAt,
      })),
  })).filter((s) => s.points.length > 0);

  return (
    <>
      {/* Text fallback: this is the same data as the "Recent requests" table elsewhere on this page. */}
      <p className="sr-only">
        Line chart of {chronological.length} recent requests&apos; latency over
        time, split by cache status (HIT, MISS, N/A). See the Recent requests
        table on this page for the same data in text form.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          aria-hidden="true"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="timeMs"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatAxisTime}
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
          />
          <YAxis
            dataKey="durationMs"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            label={{
              value: "Latency (ms)",
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
            labelFormatter={(value) =>
              formatClockTime(new Date(value as number).toISOString())
            }
            formatter={(value, name, item) => {
              const payload = item.payload as ChartPoint;
              return [
                `${formatMs(value as number)} · ${payload.method} ${payload.route}`,
                name,
              ];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              name={s.label}
              data={s.points}
              dataKey="durationMs"
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
