import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  Monitor,
  Server,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeCacheStatus } from "@/lib/status";
import { StatusBadge } from "@/components/ui/status-badge";

type NodeTone = "neutral" | "accent" | "hit";

const NODE_TONE_CLASSES: Record<NodeTone, string> = {
  neutral: "border-border bg-surface text-foreground",
  accent: "border-accent/30 bg-accent/5 text-accent",
  hit: "border-status-hit/30 bg-status-hit/5 text-status-hit",
};

const NODE_ICON_CLASSES: Record<NodeTone, string> = {
  neutral: "text-muted-foreground",
  accent: "text-accent",
  hit: "text-status-hit",
};

function DiagramNode({
  icon: Icon,
  label,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  tone?: NodeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center font-mono text-xs font-semibold sm:text-sm",
        NODE_TONE_CLASSES[tone],
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-3.5", NODE_ICON_CLASSES[tone])}
      />
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
    <div className="flex flex-col gap-4 rounded-lg border border-status-down/20 bg-status-down/5 p-6">
      <div className="flex items-center gap-2">
        <XCircle
          aria-hidden="true"
          className="size-4 shrink-0 text-status-down"
        />
        <p className="text-base font-semibold text-foreground">
          Without Caching
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DiagramNode icon={Monitor} label="Client" />
        <FlowArrow />
        <DiagramNode icon={Server} label="API" />
        <FlowArrow />
        <DiagramNode icon={Database} label="PostgreSQL" />
      </div>

      <p className="text-xs text-muted">Every request hits the database.</p>
    </div>
  );
}

export function WithCacheAsideDiagram() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-status-hit/20 bg-status-hit/5 p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2
          aria-hidden="true"
          className="size-4 shrink-0 text-status-hit"
        />
        <p className="text-base font-semibold text-foreground">
          With Cache-Aside
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DiagramNode icon={Monitor} label="Client" />
          <FlowArrow />
          <DiagramNode icon={Server} label="API" />
          <FlowArrow />
          <DiagramNode icon={Database} label="Redis" tone="accent" />
          <FlowArrow />
          <StatusBadge descriptor={describeCacheStatus("HIT")} />
          <FlowArrow />
          <DiagramNode icon={FileText} label="Return data" tone="hit" />
          <span className="text-xs text-muted">fast — no DB hit</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <ArrowDownRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <StatusBadge descriptor={describeCacheStatus("MISS")} />
          <FlowArrow />
          <DiagramNode icon={Database} label="PostgreSQL" />
          <FlowArrow />
          <DiagramNode icon={Database} label="Redis SET" tone="accent" />
          <FlowArrow />
          <DiagramNode icon={FileText} label="Return data" />
        </div>
      </div>

      <p className="text-xs text-muted">
        Reads check Redis first — hits skip the database, misses repopulate the
        cache.
      </p>
    </div>
  );
}
