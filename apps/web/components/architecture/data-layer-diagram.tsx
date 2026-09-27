import { Database } from "lucide-react";

const MODELS = [
  { name: "Product", detail: "Product catalog data" },
  { name: "RequestMetric", detail: "Real request traffic metrics" },
  { name: "BenchmarkRun", detail: "Real benchmark results" },
];

/** docs/architecture.md's Prisma schema — the three models PROJECT_SPEC.md §8 defines, all backed by real traffic/benchmark writes, not seed data. */
export function DataLayerDiagram() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2">
        <Database aria-hidden="true" className="size-4 text-blue-500" />
        <span className="font-mono text-sm font-semibold text-foreground">
          PostgreSQL
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODELS.map((model) => (
          <div
            key={model.name}
            className="rounded-lg border border-border bg-surface p-4 text-center"
          >
            <p className="font-mono text-sm font-semibold text-foreground">
              {model.name}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {model.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
