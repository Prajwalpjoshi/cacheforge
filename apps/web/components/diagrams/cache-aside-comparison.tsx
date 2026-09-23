import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeCacheStatus } from "@/lib/status";
import { StatusBadge } from "@/components/ui/status-badge";

type NodeTone = "neutral" | "accent" | "hit";

const NODE_TONE_CLASSES: Record<NodeTone, string> = {
  neutral: "border-border bg-surface text-foreground",
  accent: "border-accent/30 bg-accent/5 text-accent",
  hit: "border-status-hit/30 bg-status-hit/5 text-status-hit",
};

function DiagramNode({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: NodeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-center font-mono text-xs font-semibold sm:text-sm",
        NODE_TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}

function FlowArrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
}

/** Two independent, non-overlapping diagram cards — the previous single flex row overflowed its grid column on any viewport under ~1400px because a 4-step chain doesn't fit half of a max-w-5xl container. Each card here wraps internally instead of spilling into its neighbor. */
export function WithoutCachingDiagram() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-status-down/20 bg-status-down/5 p-6">
      <div className="flex items-center gap-2">
        <XCircle
          aria-hidden="true"
          className="size-4 shrink-0 text-status-down"
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Without caching
        </p>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        <DiagramNode label="Client" />
        <FlowArrow />
        <DiagramNode label="API" />
        <FlowArrow />
        <DiagramNode label="PostgreSQL" />
      </div>

      <p className="text-xs text-muted">Every request hits the database.</p>
    </div>
  );
}

export function WithCacheAsideDiagram() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-lg border border-status-hit/20 bg-status-hit/5 p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2
          aria-hidden="true"
          className="size-4 shrink-0 text-status-hit"
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          With cache-aside
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DiagramNode label="Client" />
          <FlowArrow />
          <DiagramNode label="API" />
          <FlowArrow />
          <DiagramNode label="Redis" tone="accent" />
        </div>

        <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-center gap-x-3 gap-y-3 border-t border-border/60 pt-3">
          <StatusBadge descriptor={describeCacheStatus("HIT")} />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FlowArrow />
            <DiagramNode label="Return data" tone="hit" />
            <span className="text-xs text-muted">fast — no DB hit</span>
          </div>

          <StatusBadge descriptor={describeCacheStatus("MISS")} />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FlowArrow />
            <DiagramNode label="PostgreSQL" />
            <FlowArrow />
            <DiagramNode label="Redis SET" tone="accent" />
            <FlowArrow />
            <DiagramNode label="Return data" />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted">
        Reads check Redis first — hits skip the database, misses repopulate the
        cache.
      </p>
    </div>
  );
}
