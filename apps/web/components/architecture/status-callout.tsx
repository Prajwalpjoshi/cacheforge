import { CheckCircle2 } from "lucide-react";

/** A compact, scannable restatement of docs/architecture.md's own opening status blockquote — the blockquote itself still renders unchanged further down in the raw markdown, this is purely a more prominent visual entry point above the diagrams. */
export function StatusCallout() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-status-hit/20 bg-status-hit/5 px-4 py-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-status-hit/10 text-status-hit">
        <CheckCircle2 aria-hidden="true" className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">
          Current implementation — Phase 5, production frontend
        </p>
        <p className="text-xs text-muted">
          This page documents what is actually built, not an aspirational
          design.
        </p>
      </div>
    </div>
  );
}
