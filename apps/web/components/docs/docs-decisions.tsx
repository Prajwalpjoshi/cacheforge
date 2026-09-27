import { parseDecisions } from "@/lib/parse-decisions";
import { DecisionCard } from "@/components/docs/decision-card";
import { MarkdownContent } from "@/components/docs/markdown-content";
import { TechnicalDetails } from "@/components/docs/technical-details";

/**
 * docs/decisions.md's ADR log as compact, collapsible cards instead of one
 * long markdown scroll. Every Context/Decision/Reason/Trade-off field is
 * the file's own text, unedited — parseDecisions only splits it into
 * fields, it never rewrites or summarizes a decision's reasoning.
 */
export function DocsDecisions({ content }: { content: string }) {
  const { intro, entries } = parseDecisions(content);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Decisions (ADR log)
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Engineering decisions made during the build, in Context / Decision
          / Reason / Trade-off form. Click a decision to expand it.
        </p>
      </div>

      {intro && (
        <div className="rounded-lg border border-border bg-surface-raised/40 px-4 py-3">
          <MarkdownContent content={intro} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <DecisionCard key={`${entry.date}-${entry.title}`} entry={entry} />
        ))}
      </div>

      <TechnicalDetails summary={`View raw decisions.md (${entries.length} decisions)`}>
        <MarkdownContent content={content} />
      </TechnicalDetails>
    </div>
  );
}
