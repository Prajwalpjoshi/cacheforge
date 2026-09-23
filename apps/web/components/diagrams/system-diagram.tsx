import { ArrowDown, Database, Layers, Monitor, Server } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DATA_LAYER: { label: string; icon: LucideIcon }[] = [
  { label: "PostgreSQL", icon: Database },
  { label: "Redis", icon: Database },
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
      <Arrow />
      <div
        className={cn(
          "flex flex-wrap justify-center",
          compact ? "gap-3" : "gap-4",
        )}
      >
        {DATA_LAYER.map(({ label, icon }) => (
          <Box
            key={label}
            icon={icon}
            label={label}
            tone={label === "Redis" ? "accent" : "neutral"}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

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
  tone?: "neutral" | "accent";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border text-center",
        compact ? "px-3 py-2" : "px-5 py-3",
        tone === "accent"
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-surface",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          compact ? "size-3.5" : "size-4",
          tone === "accent" ? "text-accent" : "text-muted-foreground",
        )}
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
