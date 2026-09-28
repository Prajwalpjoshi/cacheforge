import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BranchOutcome {
  label: string;
  steps: string[];
  tone: "success" | "neutral";
}

/** A hand-built decision-branch diagram (no Mermaid dependency) for the cache-aside read path's HIT/MISS fork. */
export function BranchDiagram({
  entry,
  question,
  outcomes,
}: {
  entry: string;
  question: string;
  outcomes: [BranchOutcome, BranchOutcome];
}) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <div className="max-w-full break-words rounded-lg border border-border bg-surface px-4 py-2 text-center font-mono text-sm font-semibold text-foreground">
        {entry}
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="max-w-full break-words rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-center font-mono text-sm font-semibold text-accent">
        {question}
      </div>
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <div
            key={outcome.label}
            className="flex min-w-0 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "break-words font-mono text-xs font-semibold",
                outcome.tone === "success"
                  ? "text-status-hit"
                  : "text-status-miss",
              )}
            >
              {outcome.label}
            </span>
            <div className="flex w-full min-w-0 flex-col items-center gap-1">
              {outcome.steps.map((step, index) => (
                <div
                  key={step}
                  className="flex w-full min-w-0 flex-col items-center gap-1"
                >
                  <div className="max-w-full break-words rounded-md border border-border bg-surface px-3 py-1.5 text-center font-mono text-xs text-foreground">
                    {step}
                  </div>
                  {index < outcome.steps.length - 1 && (
                    <ArrowDown
                      aria-hidden="true"
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
