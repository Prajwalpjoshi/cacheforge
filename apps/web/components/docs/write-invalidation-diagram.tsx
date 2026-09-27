import { FlowDiagram } from "@/components/diagrams/flow-diagram";

/** docs/architecture.md's write path — invalidation and the pub/sub event only ever fire after the PostgreSQL mutation has committed, never before or on a rejected write. */
export function WriteInvalidationDiagram() {
  return (
    <div className="flex flex-col gap-3">
      <FlowDiagram
        title="POST / PUT / DELETE /api/products"
        tone="accent"
        steps={[
          { label: "PostgreSQL mutation", detail: "Must commit first" },
          { label: "Cache invalidation", detail: "DEL key + list tag" },
          { label: "Publish event", detail: "cacheforge:events" },
          { label: "Next GET", detail: "Fresh data, cache repopulates" },
        ]}
      />
      <p className="text-xs text-muted">
        Invalidation and the pub/sub event only ever fire{" "}
        <strong className="text-foreground">after</strong> the database
        mutation has committed — a rejected write (400/404/409) never
        invalidates or publishes anything.
      </p>
    </div>
  );
}
