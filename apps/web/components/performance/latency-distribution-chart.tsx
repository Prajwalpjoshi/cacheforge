"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMs } from "@/lib/format";

/** Sorted raw per-iteration latencies from one benchmark run — the actual measured samples, not a bucketed approximation. */
export function LatencyDistributionChart({
  latenciesMs,
}: {
  latenciesMs: number[];
}) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const data = sorted.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="index"
          tick={{ fontSize: 10, fill: "var(--color-muted)" }}
          label={{
            value: "sorted samples",
            position: "insideBottom",
            offset: -2,
            fontSize: 10,
            fill: "var(--color-muted)",
          }}
        />
        <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value) => [formatMs(value as number), "latency"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-accent)"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
