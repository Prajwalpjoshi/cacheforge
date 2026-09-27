import { Lightbulb } from "lucide-react";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";

/** docs/architecture.md's lib/api/*.ts section — every response is validated against a packages/contracts Zod schema before the rest of the app ever sees it, shared by apps/api and apps/web alike. */
export function ContractValidationDiagram() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2">
        <Lightbulb aria-hidden="true" className="size-4 shrink-0 text-accent" />
        <p className="text-sm font-semibold text-accent">
          Architecture decision — shared contracts
        </p>
      </div>
      <FlowDiagram
        title="Every API response"
        tone="accent"
        steps={[
          { label: "Next.js" },
          { label: "lib/api/*" },
          { label: "@cacheforge/contracts" },
          { label: "Zod validation" },
          { label: "Fastify API" },
        ]}
      />
      <p className="text-xs text-muted">
        Backend and frontend responses are validated against the same
        shared schemas, so a contract drift between{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          apps/api
        </code>{" "}
        and{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          apps/web
        </code>{" "}
        fails loudly in development rather than rendering silently-wrong
        data.
      </p>
    </div>
  );
}
