const ROLES = [
  {
    name: "Next.js",
    role: "The only thing the browser talks to. Renders the marketing site and the internal app shell, fetches data client-side with TanStack Query.",
  },
  {
    name: "Fastify",
    role: "The API layer — routes are thin, controllers translate HTTP to service calls, services hold business logic, repositories are the only layer that imports Prisma.",
  },
  {
    name: "Prisma",
    role: "Typed access to PostgreSQL via driver adapters (@prisma/adapter-pg). Repositories are the only code that imports the generated client.",
  },
  {
    name: "PostgreSQL",
    role: "The source of truth for Product, RequestMetric, and BenchmarkRun data. The API is never wrong without Redis — only slower.",
  },
  {
    name: "Redis",
    role: "A pure performance layer via cache-kit: cache-aside reads, tag-based list invalidation, fixed-window rate limiting, and Pub/Sub events.",
  },
  {
    name: "cache-kit",
    role: "A framework-agnostic package (packages/cache-kit) exposing createCache/createRateLimiter/createPubSub over one injected Redis client — no Fastify or CacheForge-specific knowledge inside it.",
  },
  {
    name: "Shared contracts",
    role: "Zod schemas in packages/contracts define every request/response shape once, imported by both apps/api (validation) and apps/web (types + runtime response checks).",
  },
  {
    name: "Metrics pipeline",
    role: "A global onResponse hook times every request and fire-and-forgets a RequestMetric insert; /api/metrics/summary aggregates it live in SQL.",
  },
  {
    name: "Benchmark engine",
    role: "Runs DB_ONLY/CACHE_ONLY/COMPARISON entirely in-process (no HTTP loopback), measuring with process.hrtime.bigint() and nearest-rank percentiles.",
  },
  {
    name: "Pub/Sub",
    role: "Product writes publish product.updated/product.deleted on a single cacheforge:events Redis channel.",
  },
  {
    name: "Rate limiting",
    role: "A Redis-backed fixed-window counter on every /api/* route except /api/health, stricter on writes, returning 429 + Retry-After.",
  },
];

export function ComponentRoles() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ROLES.map((item) => (
        <div
          key={item.name}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <h3 className="font-mono text-sm font-semibold text-accent">
            {item.name}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-muted">{item.role}</p>
        </div>
      ))}
    </div>
  );
}
