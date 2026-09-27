const BOUNDARIES = [
  {
    title: "Repository boundary",
    detail: "Repositories are the only layer importing Prisma.",
  },
  {
    title: "Service boundary",
    detail: "Services contain business logic and cache decisions.",
  },
  {
    title: "Cache boundary",
    detail: "cache-kit is framework-agnostic.",
  },
  {
    title: "API boundary",
    detail: "lib/api is the frontend API access layer.",
  },
  {
    title: "Contract boundary",
    detail: "Zod contracts are shared by API and web.",
  },
  {
    title: "Observability boundary",
    detail: "request-context is the single request measurement point.",
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
