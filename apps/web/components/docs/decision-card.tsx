import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/docs/markdown-content";
import type { DecisionEntry } from "@/lib/parse-decisions";

function DecisionField({ label, content }: { label: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {label}
      </p>
      <MarkdownContent content={content} />
    </div>
  );
}

/**
 * One ADR from docs/decisions.md as a compact, collapsed-by-default card —
 * with 19 real decisions logged, expanding all of them by default would be
 * the "wall of text" this page is meant to avoid. Native <details> keeps it
 * keyboard/screen-reader accessible with zero client JS, matching
 * TechnicalDetails' pattern elsewhere on this page.
 */
export function DecisionCard({ entry }: { entry: DecisionEntry }) {
  return (
    <details className="group rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2.5 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="font-mono text-xs text-muted-foreground">
          {entry.date}
        </span>
        <Badge tone="accent">{entry.tag}</Badge>
        <span className="text-sm font-semibold text-foreground">
          {entry.title}
        </span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <DecisionField label="Context" content={entry.context} />
        <DecisionField label="Decision" content={entry.decision} />
        <DecisionField label="Why" content={entry.reason} />
        <DecisionField label="Trade-off" content={entry.tradeoff} />
      </div>
    </details>
  );
}
