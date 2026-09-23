"use client";

import { useHealth } from "@/lib/hooks/use-health";
import { cn } from "@/lib/utils";

type ConnectionState = "checking" | "connected" | "degraded" | "down";

const COPY: Record<
  ConnectionState,
  { title: string; subtitle: string; dot: string }
> = {
  checking: {
    title: "Checking…",
    subtitle: "Connecting to API",
    dot: "bg-status-neutral",
  },
  connected: {
    title: "API Connected",
    subtitle: "All systems operational",
    dot: "bg-status-hit",
  },
  degraded: {
    title: "API Degraded",
    subtitle: "One or more services down",
    dot: "bg-status-miss",
  },
  down: {
    title: "API Unreachable",
    subtitle: "Unable to reach the API",
    dot: "bg-status-down",
  },
};

/** Two-line "API Connected / All systems operational" sidebar footer block — same live health poll as SystemStatusPill, just a richer presentation for the desktop sidebar's spare footer real estate. */
export function ApiConnectionStatus() {
  const { data, isError, isPending } = useHealth();

  const state: ConnectionState = isPending
    ? "checking"
    : isError || !data
      ? "down"
      : data.data.status === "ok"
        ? "connected"
        : "degraded";

  const { title, subtitle, dot } = COPY[state];

  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
