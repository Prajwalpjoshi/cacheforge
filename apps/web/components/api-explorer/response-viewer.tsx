import type { ExplorerResult } from "@/lib/api-explorer/execute-request";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeHttpStatus } from "@/lib/status";
import { formatMs } from "@/lib/format";
import { InlineErrorBanner } from "@/components/ui/error-state";

export function ResponseViewer({ result }: { result: ExplorerResult }) {
  if (result.networkError) {
    return <InlineErrorBanner message={result.networkError} />;
  }

  const headerEntries = Object.entries(result.headers);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {result.status !== null && (
          <StatusBadge descriptor={describeHttpStatus(result.status)} />
        )}
        <span className="font-mono text-xs text-muted">
          {formatMs(result.latencyMs)} (browser-measured, includes network)
        </span>
      </div>

      {headerEntries.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Response headers
          </p>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-2">
            {headerEntries.map(([name, value]) => (
              <div key={name} className="flex gap-2">
                <dt className="text-muted">{name}:</dt>
                <dd className="text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Body
        </p>
        <pre className="max-h-96 overflow-auto rounded-md border border-border bg-surface-raised p-3 font-mono text-xs text-foreground">
          {result.body === null
            ? "(empty)"
            : JSON.stringify(result.body, null, 2)}
        </pre>
      </div>
    </div>
  );
}
