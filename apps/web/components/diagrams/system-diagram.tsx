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
  title?: string;
}[] = [
  {
    label: "PostgreSQL",
    detail: "Data",
    icon: Database,
    tone: "postgres",
    title: "Source of truth — Product data, request metrics",
  },
  {
    label: "Redis",
    detail: "Cache",
    icon: Database,
    tone: "redis",
    title: "Cache-aside layer — TTL + invalidation, fail-open behavior",
  },
];

/**
 * The top-level PROJECT_SPEC.md #6 architecture, adjusted to what actually exists: Next.js -> Fastify -> {Redis, PostgreSQL}, with the observability/benchmark pipeline living inside the API rather than as a separate box. `compact` drops the descriptive subtext for the hero placement; the Architecture page uses the full version.
 * `animated` adds a subtle, staggered opacity pulse along the arrows (docs page only) to suggest request flow direction — a no-op unless the OS/browser has no `prefers-reduced-motion` preference (see the `.animate-flow-pulse` rule in globals.css), so it never fights that setting.
 */
export function SystemDiagram({
  compact = false,
  animated = false,
}: {
  compact?: boolean;
  animated?: boolean;
}) {
  return (
    <div
      className={cn("flex flex-col items-center", compact ? "gap-2" : "gap-3")}
    >
      <Box icon={Monitor} label="Browser" compact={compact} />
      <Arrow animated={animated} delayMs={0} />
      <Box
        icon={Layers}
        label="Next.js"
        detail={compact ? undefined : "apps/web — App Router, TanStack Query"}
        tone="accent"
        compact={compact}
      />
      <Arrow animated={animated} delayMs={300} />
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
            animated && "animate-flow-pulse",
          )}
          style={animated ? { animationDelay: "600ms" } : undefined}
        />
        <ArrowDownRight
          aria-hidden="true"
          className={cn(
            compact ? "size-3.5" : "size-4",
            "text-muted-foreground",
            animated && "animate-flow-pulse",
          )}
          style={animated ? { animationDelay: "600ms" } : undefined}
        />
      </div>
      <div
        className={cn(
          "flex flex-wrap justify-center",
          compact ? "gap-3" : "gap-4",
        )}
      >
        {DATA_LAYER.map(({ label, detail, icon, tone, title }) => (
          <Box
            key={label}
            icon={icon}
            label={label}
            detail={detail}
            tone={tone}
            compact={compact}
            title={title}
            pulse={animated && tone === "redis"}
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
  title,
  pulse = false,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  tone?: NodeTone;
  compact?: boolean;
  /** Native tooltip — supplementary only; the same fact is always visible in the section's "Technical details" disclosure, never hover-only. */
  title?: string;
  pulse?: boolean;
}) {
  return (
    <div
      title={title}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border text-center",
        compact ? "px-3 py-2" : "px-5 py-3",
        TONE_BOX_CLASSES[tone],
        pulse && "animate-flow-pulse",
      )}
      style={pulse ? { animationDelay: "900ms" } : undefined}
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

function Arrow({
  animated = false,
  delayMs = 0,
}: {
  animated?: boolean;
  delayMs?: number;
}) {
  return (
    <ArrowDown
      aria-hidden="true"
      className={cn(
        "size-4 text-muted-foreground",
        animated && "animate-flow-pulse",
      )}
      style={animated ? { animationDelay: `${delayMs}ms` } : undefined}
    />
  );
}
