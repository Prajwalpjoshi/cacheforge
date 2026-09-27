import {
  Archive,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  Cog,
  Database,
  Route,
  Shuffle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const CHAIN: { label: string; icon: LucideIcon }[] = [
  { label: "Routes", icon: Route },
  { label: "Controllers", icon: Shuffle },
  { label: "Services", icon: Cog },
];

const LAYER_NOTES = [
  { label: "Routes", detail: "HTTP paths and schemas" },
  { label: "Controllers", detail: "HTTP request/response translation" },
  { label: "Services", detail: "Business logic and cache decisions" },
  { label: "Repositories", detail: "Database access through Prisma" },
  { label: "cache-kit", detail: "Framework-agnostic Redis toolkit" },
];

/** docs/architecture.md: "routes → controllers → services → repositories/cache → Prisma/Redis", plus "fastify -> cache-kit -> redis" and "repositories are the only layer that imports Prisma" — rendered as one linear chain that forks at the service boundary, since that's the exact point where the codebase splits into a Prisma path and a cache-kit path. */
export function BackendLayersDiagram() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        {CHAIN.map((step, index) => (
          <div key={step.label} className="flex flex-col items-center gap-2">
            <div className="flex min-w-40 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-center">
              <step.icon aria-hidden="true" className="size-4 text-accent" />
              <span className="font-mono text-sm font-semibold text-foreground">
                {step.label}
              </span>
            </div>
            {index < CHAIN.length - 1 && (
              <ArrowDown
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            )}
          </div>
        ))}

        <div className="flex gap-10 pt-1">
          <ArrowDownLeft
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <ArrowDownRight
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex min-w-36 flex-col items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2.5 text-center">
            <Archive aria-hidden="true" className="size-4 text-blue-500" />
            <span className="font-mono text-sm font-semibold text-foreground">
              Repository
            </span>
            <span className="text-xs text-muted">via Prisma</span>
          </div>
          <div className="flex min-w-36 flex-col items-center gap-1 rounded-lg border border-status-down/30 bg-status-down/5 px-4 py-2.5 text-center">
            <Zap aria-hidden="true" className="size-4 text-status-down" />
            <span className="font-mono text-sm font-semibold text-foreground">
              cache-kit
            </span>
            <span className="text-xs text-muted">Redis toolkit</span>
          </div>
        </div>

        <div className="flex gap-10 pt-1">
          <ArrowDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <ArrowDown
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex min-w-36 items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2.5">
            <Database aria-hidden="true" className="size-4 text-blue-500" />
            <span className="font-mono text-sm font-semibold text-foreground">
              PostgreSQL
            </span>
          </div>
          <div className="flex min-w-36 items-center justify-center gap-1.5 rounded-lg border border-status-down/30 bg-status-down/5 px-4 py-2.5">
            <Database aria-hidden="true" className="size-4 text-status-down" />
            <span className="font-mono text-sm font-semibold text-foreground">
              Redis
            </span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LAYER_NOTES.map((note) => (
          <div
            key={note.label}
            className={cn(
              "rounded-md border border-border bg-surface-raised/40 px-3 py-2",
            )}
          >
            <dt className="font-mono text-xs font-semibold text-accent">
              {note.label}
            </dt>
            <dd className="mt-0.5 text-xs leading-5 text-muted">
              {note.detail}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
