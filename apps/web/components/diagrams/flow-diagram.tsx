import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowStep {
  label: string;
  detail?: string;
}

/** A dependency-free, hand-built flow diagram (no Mermaid/diagramming library) — PROJECT_SPEC.md #6/#7's request/cache-flow diagrams, rendered as accessible boxes + arrows. */
export function FlowDiagram({
  title,
  steps,
  tone = "neutral",
}: {
  title: string;
  steps: FlowStep[];
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <div
        role="list"
        className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-3"
      >
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="flex flex-col items-center sm:flex-row"
          >
            <div
              role="listitem"
              className={cn(
                "flex min-w-28 max-w-48 flex-col items-center gap-0.5 rounded-lg border px-4 py-3 text-center",
                tone === "accent"
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-surface",
              )}
            >
              <span className="font-mono text-sm font-semibold text-foreground">
                {step.label}
              </span>
              {step.detail && (
                <span className="text-xs text-muted">{step.detail}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="flex items-center justify-center py-1 text-muted-foreground sm:px-2 sm:py-0">
                <ArrowDown aria-hidden="true" className="size-4 sm:hidden" />
                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-4 sm:block"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
