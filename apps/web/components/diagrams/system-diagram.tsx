import { ArrowDown } from "lucide-react";

const DATA_LAYER = ["Redis", "PostgreSQL"];

/** The top-level PROJECT_SPEC.md #6 architecture, adjusted to what actually exists: Next.js -> Fastify -> {Redis, PostgreSQL}, with the observability/benchmark pipeline living inside the API rather than as a separate box. */
export function SystemDiagram() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Box label="Browser" />
      <Arrow />
      <Box
        label="Next.js UI"
        detail="apps/web — App Router, TanStack Query"
        tone="accent"
      />
      <Arrow />
      <Box
        label="Fastify API"
        detail="apps/api — routes → controllers → services → repositories"
        tone="accent"
      />
      <Arrow />
      <div className="flex flex-wrap justify-center gap-4">
        {DATA_LAYER.map((name) => (
          <Box key={name} label={name} />
        ))}
      </div>
    </div>
  );
}

function Box({
  label,
  detail,
  tone = "neutral",
}: {
  label: string;
  detail?: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <div
      className={
        tone === "accent"
          ? "flex flex-col items-center gap-0.5 rounded-lg border border-accent/30 bg-accent/5 px-5 py-3 text-center"
          : "flex flex-col items-center gap-0.5 rounded-lg border border-border bg-surface px-5 py-3 text-center"
      }
    >
      <span className="font-mono text-sm font-semibold text-foreground">
        {label}
      </span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
  );
}
