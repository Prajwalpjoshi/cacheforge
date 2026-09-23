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

const MAX_ROUTES = 5;
/** Separates method/route-suffix within the composite XAxis category key — routes/methods never contain this character. */
const AXIS_KEY_DELIMITER = "|";

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (prefix.length > 0 && !value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

/**
 * Strips the routes' shared prefix so the axis only shows what actually
 * distinguishes them (e.g. "/api/products" + "/api/products/:id" become
 * "products" + "/:id") — full paths don't fit two per narrow bar
 * category. Falls back to the route's last path segment when a route
 * equals the shared prefix exactly (so the label is never blank).
 */
function routeSuffix(route: string, prefixLength: number): string {
  const suffix = route.slice(prefixLength);
  if (suffix.length > 0) return suffix;
  return route.split("/").filter(Boolean).pop() ?? route;
}

/** Two-line "METHOD / suffix" tick so long paths don't force the diagonal labels the original single-line axis needed. */
function RouteAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const value = payload?.value ?? "";
  const [method = "", suffix = ""] = value.split(AXIS_KEY_DELIMITER);

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="var(--color-muted)"
      >
        {method}
      </text>
      <text
        x={0}
        y={0}
        dy={26}
        textAnchor="middle"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--color-muted)"
      >
        {suffix}
      </text>
    </g>
  );
}

/** Real per-route aggregates from GET /api/metrics/summary's byRoute — never synthetic points. Already ordered by request count desc by the API; this only takes the top MAX_ROUTES. */
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

  const topRoutes = byRoute.slice(0, MAX_ROUTES);
  const sharedPrefixLength = longestCommonPrefix(
    topRoutes.map((route) => route.route),
  ).length;

  const data = topRoutes.map((route) => ({
    axisKey: `${route.method}${AXIS_KEY_DELIMITER}${routeSuffix(route.route, sharedPrefixLength)}`,
    fullLabel: `${route.method} ${route.route}`,
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
            <tr key={route.axisKey}>
              <td>{route.fullLabel}</td>
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
            dataKey="axisKey"
            tick={<RouteAxisTick />}
            interval={0}
            height={40}
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
            labelFormatter={(_, item) => {
              const payload = item?.[0]?.payload as
                (typeof data)[number] | undefined;
              return payload?.fullLabel ?? "";
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
