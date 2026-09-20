"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/health";
import { queryKeys } from "@/lib/query-keys";
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
  const { data, isError } = useQuery({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 10_000,
  });

  return (
    <StatusBadge
      descriptor={describeOverallHealth(overallHealth(data, isError))}
    />
  );
}
