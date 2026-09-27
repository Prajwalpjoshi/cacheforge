import { Lightbulb } from "lucide-react";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";
import { TechnicalDetails } from "@/components/docs/technical-details";

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
      <p className="text-sm leading-6 text-muted">
        The backend and frontend share the same Zod contracts, so an unexpected
        API response shape is detected before incorrect data reaches the UI.
      </p>
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
      <TechnicalDetails>
        <p>
          Schemas live in{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            packages/contracts/src/*.ts
          </code>{" "}
          — one file per resource (health, product, cache, metrics, benchmark).
          Every module in{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            apps/web/lib/api/*.ts
          </code>{" "}
          parses the response through the matching schema before the rest of the
          app ever sees it, so a contract drift between{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            apps/api
          </code>{" "}
          and{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            apps/web
          </code>{" "}
          fails loudly in development rather than rendering silently-wrong data.
        </p>
      </TechnicalDetails>
    </div>
  );
}
