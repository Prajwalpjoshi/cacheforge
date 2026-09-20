"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RouteMetricsSummary } from "@cacheforge/contracts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMs, formatPercent } from "@/lib/format";

/** Real per-route aggregates from GET /api/metrics/summary's byRoute — never synthetic points. */
export function RequestVolumeChart({
  byRoute,
}: {
  byRoute: RouteMetricsSummary[];
}) {
  if (byRoute.length === 0) {
    return (
      <EmptyState
        title="No request data yet"
        description="Send real traffic — for example from the API Explorer — and this chart will populate."
      />
    );
  }

  const data = byRoute.map((route) => ({
    name: `${route.method} ${route.route}`,
    requests: route.requestCount,
    p95Ms: route.p95Ms,
    errorRate: route.errorRate,
  }));

  return (
    <>
      {/* Text/table fallback for the chart below (PROJECT_SPEC.md #13/#20) — same data, screen-reader only. */}
      <table className="sr-only">
        <caption>Request count, P95 latency, and error rate by route</caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Requests</th>
            <th scope="col">P95 latency</th>
            <th scope="col">Error rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((route) => (
            <tr key={route.name}>
              <td>{route.name}</td>
              <td>{route.requests}</td>
              <td>{formatMs(route.p95Ms)}</td>
              <td>{formatPercent(route.errorRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          aria-hidden="true"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, name, item) => {
              if (name === "requests") {
                const payload = item.payload as (typeof data)[number];
                return [
                  `${value} requests · p95 ${formatMs(payload.p95Ms)} · errors ${formatPercent(payload.errorRate)}`,
                  "",
                ];
              }
              return [value, name];
            }}
          />
          <Bar
            dataKey="requests"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
