"use client";

import type { getHealth } from "@/lib/api/health";
import { useHealth } from "@/lib/hooks/use-health";
import { describeOverallHealth, type OverallHealth } from "@/lib/status";
import { StatusBadge } from "@/components/ui/status-badge";

function overallHealth(
  data: Awaited<ReturnType<typeof getHealth>> | undefined,
  isError: boolean,
): OverallHealth {
  if (isError || !data) return "down";
  return data.data.status === "ok" ? "ok" : "degraded";
}

/** Compact, always-visible system status in the sidebar/topbar — polled independently of the Health page so the shell always reflects live reality. */
export function SystemStatusPill() {
  const { data, isError } = useHealth();

  return (
    <StatusBadge
      descriptor={describeOverallHealth(overallHealth(data, isError))}
    />
  );
}
