import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  Database,
  Layers,
  Monitor,
  Server,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeTone = "neutral" | "accent" | "postgres" | "redis";

const DATA_LAYER: {
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: NodeTone;
}[] = [
  { label: "PostgreSQL", detail: "Data", icon: Database, tone: "postgres" },
  { label: "Redis", detail: "Cache", icon: Database, tone: "redis" },
];

/** The top-level PROJECT_SPEC.md #6 architecture, adjusted to what actually exists: Next.js -> Fastify -> {Redis, PostgreSQL}, with the observability/benchmark pipeline living inside the API rather than as a separate box. `compact` drops the descriptive subtext for the hero placement; the Architecture page uses the full version. */
export function SystemDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("flex flex-col items-center", compact ? "gap-2" : "gap-3")}
    >
      <Box icon={Monitor} label="Browser" compact={compact} />
      <Arrow />
      <Box
        icon={Layers}
        label="Next.js"
        detail={compact ? undefined : "apps/web — App Router, TanStack Query"}
        tone="accent"
        compact={compact}
      />
      <Arrow />
      <Box
        icon={Server}
        label="Fastify API"
        detail={
          compact
            ? undefined
            : "apps/api — routes → controllers → services → repositories"
        }
        tone="accent"
        compact={compact}
      />
      <div className={cn("flex justify-center", compact ? "gap-8" : "gap-12")}>
        <ArrowDownLeft
          aria-hidden="true"
          className={cn(
            compact ? "size-3.5" : "size-4",
            "text-muted-foreground",
          )}
        />
        <ArrowDownRight
          aria-hidden="true"
          className={cn(
            compact ? "size-3.5" : "size-4",
            "text-muted-foreground",
          )}
        />
      </div>
      <div
        className={cn(
          "flex flex-wrap justify-center",
          compact ? "gap-3" : "gap-4",
        )}
      >
        {DATA_LAYER.map(({ label, detail, icon, tone }) => (
          <Box
            key={label}
            icon={icon}
            label={label}
            detail={detail}
            tone={tone}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

const TONE_BOX_CLASSES: Record<NodeTone, string> = {
  neutral: "border-border bg-surface",
  accent: "border-accent/30 bg-accent/5",
  postgres: "border-blue-500/30 bg-blue-500/5",
  redis: "border-status-down/30 bg-status-down/5",
};

const TONE_ICON_CLASSES: Record<NodeTone, string> = {
  neutral: "text-muted-foreground",
  accent: "text-accent",
  postgres: "text-blue-500",
  redis: "text-status-down",
};

function Box({
  icon: Icon,
  label,
  detail,
  tone = "neutral",
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: NodeTone;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border text-center",
        compact ? "px-3 py-2" : "px-5 py-3",
        TONE_BOX_CLASSES[tone],
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(compact ? "size-3.5" : "size-4", TONE_ICON_CLASSES[tone])}
      />
      <span
        className={cn(
          "font-mono font-semibold text-foreground",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {label}
      </span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
  );
}
