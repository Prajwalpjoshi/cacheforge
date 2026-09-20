import { ENDPOINTS, type EndpointDefinition } from "@/lib/api-explorer/catalog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const METHOD_TONE: Record<
  EndpointDefinition["method"],
  "accent" | "success" | "warning" | "danger"
> = {
  GET: "accent",
  POST: "success",
  PUT: "warning",
  DELETE: "danger",
};

const GROUPS = [
  "Health",
  "Products",
  "Metrics",
  "Cache",
  "Benchmarks",
] as const;

export function EndpointList({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="API endpoints" className="flex flex-col gap-4">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {group}
          </p>
          <div className="flex flex-col gap-0.5">
            {ENDPOINTS.filter((endpoint) => endpoint.group === group).map(
              (endpoint) => (
                <button
                  key={endpoint.id}
                  type="button"
                  onClick={() => onSelect(endpoint.id)}
                  aria-current={selectedId === endpoint.id ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    selectedId === endpoint.id
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface-raised hover:text-foreground",
                  )}
                >
                  <Badge
                    tone={METHOD_TONE[endpoint.method]}
                    className="shrink-0"
                  >
                    {endpoint.method}
                  </Badge>
                  <span className="truncate font-mono">{endpoint.path}</span>
                </button>
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}
