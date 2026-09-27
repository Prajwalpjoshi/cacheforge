const BOUNDARIES = [
  {
    title: "Repository",
    detail: "Database access only.",
  },
  {
    title: "Service",
    detail: "Business logic.",
  },
  {
    title: "Cache",
    detail: "Redis/caching behavior.",
  },
  {
    title: "Controller",
    detail: "HTTP request/response translation.",
  },
  {
    title: "Contracts",
    detail: "Shared API shapes.",
  },
  {
    title: "Observability",
    detail: "Request measurement and metrics.",
  },
];

/** The six engineering boundaries docs/architecture.md draws explicitly — each one a one-directional rule the codebase actually enforces (Prisma only in repositories, cache-kit unaware of Fastify, etc.), not aspirational guidance. */
export function EngineeringBoundaries() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {BOUNDARIES.map((boundary) => (
        <div
          key={boundary.title}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {boundary.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {boundary.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
