import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export function StatTile({
  label,
  value,
  hint,
  loading,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5",
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <span className="whitespace-nowrap font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
      )}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
