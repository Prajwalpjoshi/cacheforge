import { ArrowRight } from "lucide-react";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";
import { Badge } from "@/components/ui/badge";

const DASHBOARD_METRICS = [
  "Request volume",
  "Cache hit rate",
  "Error rate",
  "Latency",
];

/** docs/architecture.md's metrics pipeline (fire-and-forget RequestMetric insert, aggregated live in SQL) and docs/performance.md's three benchmark modes. */
export function ObservabilityDiagram() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <FlowDiagram
          title="Every API request"
          steps={[
            { label: "API Request" },
            { label: "RequestMetric", detail: "fire-and-forget insert" },
            { label: "PostgreSQL" },
            { label: "Dashboard" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {DASHBOARD_METRICS.map((metric) => (
            <Badge key={metric} tone="accent">
              {metric}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Benchmark modes
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">DB_ONLY</Badge>
          <Badge tone="violet">CACHE_ONLY</Badge>
          <Badge tone="accent">COMPARISON</Badge>
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="font-mono text-xs text-muted">
            Latency · P95 · P99 · Throughput
          </span>
        </div>
        <p className="text-xs text-muted">
          Measured with{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            process.hrtime.bigint()
          </code>{" "}
          directly around the same repository/service calls the real routes
          use — never a hardcoded or assumed number.
        </p>
      </div>
    </div>
  );
}
