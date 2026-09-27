import { ArrowDown } from "lucide-react";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";

/** docs/architecture.md's Frontend section — the app-shell's own real navigation (apps/web/components/app-shell/nav-items.ts), not an invented page list, funneling into lib/api/* as the one boundary that talks to Fastify. */
export function FrontendArchitectureDiagram() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-sm font-semibold text-accent">
        Next.js App Router
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm font-semibold text-foreground">
        App Shell
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />

      <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.href}
            className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-raised/40 px-2 py-2.5 text-center"
          >
            <item.icon
              aria-hidden="true"
              className="size-3.5 text-muted-foreground"
            />
            <span className="text-xs font-medium text-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm font-semibold text-foreground">
        lib/api/*
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-sm font-semibold text-accent">
        Fastify API
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          lib/api/*.ts
        </code>{" "}
        is the only code that talks to the Fastify API — every other
        component reaches it only by importing from there.
      </p>
    </div>
  );
}
