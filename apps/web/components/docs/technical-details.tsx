import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Progressive disclosure for the docs visual guide: the diagram + a plain
 * explanation stay visible, and implementation-level facts (exact keys,
 * TTLs, config vars) collapse behind this. Native `<details>` so it works
 * with zero client JS and stays keyboard/screen-reader accessible.
 */
export function TechnicalDetails({
  summary = "Technical details",
  children,
}: {
  summary?: string;
  children: ReactNode;
}) {
  return (
    <details className="group mt-4 rounded-md border border-border bg-surface-raised/40">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-accent marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 shrink-0 transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="border-t border-border px-3 py-3 text-sm leading-6 text-muted">
        {children}
      </div>
    </details>
  );
}
