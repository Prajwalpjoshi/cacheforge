import { ArrowDown, ArrowRight } from "lucide-react";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";
import { Badge } from "@/components/ui/badge";

const MODES = [
  {
    tone: "info" as const,
    label: "DB_ONLY",
    detail: "Direct repository/PostgreSQL path",
  },
  {
    tone: "violet" as const,
    label: "CACHE_ONLY",
    detail: "Real product-service cache-aside path",
  },
  {
    tone: "accent" as const,
    label: "COMPARISON",
    detail: "Runs both against the same target",
  },
];

/** docs/performance.md's benchmark engine — DB_ONLY bypasses cache-kit entirely, CACHE_ONLY is the exact cache-aside code path the real routes use, COMPARISON runs both against the same target and computes improvement percentages from the two real result sets. */
export function BenchmarkFlowDiagram() {
  return (
    <div className="flex flex-col gap-4">
      <FlowDiagram
        title="Trigger"
        steps={[{ label: "Performance Lab" }, { label: "Benchmark Service" }]}
      />

      <div className="flex flex-col items-center gap-2">
        <ArrowDown
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {MODES.map((mode) => (
            <div
              key={mode.label}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface p-3 text-center"
            >
              <Badge tone={mode.tone}>{mode.label}</Badge>
              <p className="text-xs leading-5 text-muted">{mode.detail}</p>
            </div>
          ))}
        </div>
        <ArrowDown
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="font-mono text-xs text-muted">
          Latency · Percentiles (nearest-rank) · Throughput
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-foreground">
          BenchmarkRun
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="rounded-md border border-accent/30 bg-accent/5 px-3 py-1.5 font-mono text-xs font-semibold text-accent">
          Performance UI
        </span>
      </div>

      <p className="text-xs text-muted">
        A failed run (invalid input, no products to target, Redis required but
        unreachable) never creates a{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          BenchmarkRun
        </code>{" "}
        row — persistence is the very last step of a successful run.
      </p>
    </div>
  );
}
