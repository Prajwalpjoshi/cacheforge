import type { ReactNode } from "react";

/**
 * "What it does / Why it exists / How it works" — the one recurring shape
 * used to introduce every capability (Backend API, Caching, Observability,
 * Performance Lab, Frontend) in plain language before its diagram and
 * before any file path. `path` renders last and small, never first.
 */
export function CapabilityCard({
  what,
  why,
  how,
  path,
}: {
  what: ReactNode;
  why: ReactNode;
  how: ReactNode;
  path?: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised/40 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            What it does
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{what}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Why it exists
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{why}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            How it works
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{how}</p>
        </div>
      </div>
      {path && (
        <code className="w-fit rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {path}
        </code>
      )}
    </div>
  );
}
