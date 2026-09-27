import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";
import { SystemDiagram } from "@/components/diagrams/system-diagram";
import { StatusCallout } from "@/components/architecture/status-callout";
import { CapabilityCard } from "@/components/architecture/capability-card";
import { Term } from "@/components/architecture/term";
import { BackendLayersDiagram } from "@/components/architecture/backend-layers-diagram";
import { ProductRequestFlowDiagram } from "@/components/architecture/product-request-flow-diagram";
import { RedisResponsibilities } from "@/components/architecture/redis-responsibilities";
import { DataLayerDiagram } from "@/components/architecture/data-layer-diagram";
import { ObservabilityFlowDiagram } from "@/components/architecture/observability-flow-diagram";
import { BenchmarkFlowDiagram } from "@/components/architecture/benchmark-flow-diagram";
import { FrontendArchitectureDiagram } from "@/components/architecture/frontend-architecture-diagram";
import { ContractValidationDiagram } from "@/components/architecture/contract-validation-diagram";
import { EngineeringBoundaries } from "@/components/architecture/engineering-boundaries";
import { WriteInvalidationDiagram } from "@/components/docs/write-invalidation-diagram";
import { TechnicalDetails } from "@/components/docs/technical-details";
import { MarkdownContent } from "@/components/docs/markdown-content";

/**
 * A progressive read of docs/architecture.md: plain-English explanation
 * first, diagram second, deep implementation facts last (collapsed behind
 * "Implementation details"), then the full unedited markdown file as the
 * source of truth. Every fact — including every "why" statement — is
 * drawn from docs/architecture.md, docs/caching.md, and docs/performance.md;
 * nothing here invents a number, a component, or a behavior those files
 * don't already describe.
 */
export function DocsArchitecture({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-6">
      <StatusCallout />

      {/* A. Architecture at a glance */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Architecture at a glance
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          CacheForge is a production-style API performance and caching platform
          built around PostgreSQL and Redis. A request enters through the
          Next.js frontend (or any API client) and reaches the Fastify API,
          which serves it from PostgreSQL — the system&apos;s source of truth —
          or from Redis, a pure performance layer that adds caching, rate
          limiting, and pub/sub on top of it. The goal throughout is to make API
          performance visible and measurable, not just described in prose.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemDiagram animated />
        </CardContent>
      </Card>

      {/* B. How a request moves through the system */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          How a request moves through the system
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Every product read follows the same{" "}
          <Term
            word="cache-aside"
            definition="check the cache first; if the data is missing, load it from the database and populate the cache."
          />{" "}
          pattern, whether or not Redis happens to be available right now.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What happens when you request a product?</CardTitle>
          <CardDescription>
            GET /api/products/:id, exactly as implemented in product.service.ts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductRequestFlowDiagram />
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <Term word="HIT" definition="the data was found in Redis." />
            <Term
              word="MISS"
              definition="the data was not in Redis, so PostgreSQL is queried and the result can be cached."
            />
            <Term
              word="BYPASS"
              definition="Redis cannot be used right now, so the request continues through PostgreSQL."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Write &amp; invalidation flow</CardTitle>
          <CardDescription>
            POST / PUT / DELETE /api/products — cache invalidation and the
            pub/sub event only fire after the database mutation commits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WriteInvalidationDiagram />
        </CardContent>
      </Card>

      {/* C. Backend architecture */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Backend architecture
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          One Fastify server handles every API request through the same
          consistent layers.
        </p>
      </div>

      <CapabilityCard
        what="Handles every API request — product CRUD, health checks, cache administration, metrics, and benchmarks — through one consistently-structured Fastify server."
        why="A single, consistent backend means every new capability (like the Performance Lab) reuses the same validation and error handling instead of inventing its own."
        how="Every request flows one direction only: routes define the HTTP contract, controllers translate HTTP to service calls, services hold business logic, and repositories are the only code that touches the database. A global error handler turns domain errors into consistent HTTP status codes."
        path="apps/api"
      />

      <Card>
        <CardHeader>
          <CardTitle>Backend request flow</CardTitle>
          <CardDescription>
            One-directional layering — routes never touch Prisma or Redis
            directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackendLayersDiagram />
          <TechnicalDetails>
            <p>
              CORS, Helmet, and structured Pino logging wrap every request. The
              global error handler maps domain errors to status codes —{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                NotFoundError
              </code>{" "}
              → 404,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                ConflictError
              </code>{" "}
              → 409,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                TooManyRequestsError
              </code>{" "}
              → 429,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                ServiceUnavailableError
              </code>{" "}
              → 503 — Zod validation failures become 400s with field-level
              detail, and unexpected errors become 500s, consistently across
              every route.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      {/* D. Database and Redis */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Database and Redis
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          PostgreSQL is the system&apos;s source of truth. Redis is a pure
          performance layer the API is always correct without — only slower.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data layer</CardTitle>
        </CardHeader>
        <CardContent>
          <DataLayerDiagram />
          <p className="mt-4 text-sm leading-6 text-muted">
            Prisma provides the application&apos;s database access layer. Only
            repositories communicate directly with Prisma. Services contain
            business logic and do not expose Prisma details to controllers.
          </p>
          <TechnicalDetails>
            <p>
              This Prisma version uses driver adapters rather than the legacy
              query engine — it generates a self-contained client (wired into{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                postinstall
              </code>
              ) and requires an explicit adapter,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                @prisma/adapter-pg
              </code>
              . Repositories translate Prisma&apos;s error codes (
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                P2002
              </code>{" "}
              unique violation,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                P2025
              </code>{" "}
              not found) into{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                ConflictError
              </code>
              /
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                NotFoundError
              </code>{" "}
              — controllers never see Prisma at all.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <CapabilityCard
        what="Stores frequently requested product data, enforces rate limits, and publishes write events — a pure performance and coordination layer in front of PostgreSQL."
        why="The project needs to demonstrate, with real measurements, whether caching actually improves API performance — an in-process cache couldn't do that correctly across multiple API instances, and couldn't back rate limiting or pub/sub at all."
        how="The product service calls cache.getOrSet(...) on reads: a HIT returns Redis data directly, a MISS loads PostgreSQL and stores the result in Redis, and if Redis is unreachable the service bypasses the cache and continues with PostgreSQL."
        path="packages/cache-kit"
      />

      <div className="flex flex-col gap-2">
        <Term
          word="Pub/Sub"
          definition="a Redis messaging mechanism used to publish events between parts of the system."
        />
        <Term
          word="Rate limiting"
          definition="a mechanism that restricts how many requests can be made within a time window."
        />
        <Term
          word="Fail-open"
          definition="if Redis is unavailable, continue the request through PostgreSQL instead of failing it entirely."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redis has four responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <RedisResponsibilities />
          <div className="mt-5 border-t border-border/60 pt-4">
            <FlowDiagram
              title="How the API reaches Redis"
              steps={[
                { label: "Fastify" },
                { label: "cache-kit" },
                { label: "node-redis" },
                { label: "Redis" },
              ]}
            />
            <p className="mt-3 text-xs text-muted">
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cache-kit
              </code>{" "}
              is intentionally framework-agnostic — it has no knowledge of
              Fastify, Prisma, or CacheForge&apos;s own key-naming conventions,
              so it could be dropped into an unrelated project unchanged.
            </p>
          </div>
          <TechnicalDetails>
            <p>
              One Redis connection per process, with a bounded 5s connect
              timeout so a genuinely unreachable Redis fails fast. Cache keys
              use 60s (single product) / 30s (list) TTLs; list invalidation is
              tag-based (
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                SADD
              </code>
              /
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                SMEMBERS
              </code>
              /
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                DEL
              </code>
              ), never the blocking{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                KEYS
              </code>{" "}
              command. Rate limiting also fails open (allows the request) rather
              than locking out all traffic when Redis is down — the one
              deliberate exception is that a{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                CACHE_ONLY
              </code>
              /
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                COMPARISON
              </code>{" "}
              benchmark returns 503 rather than silently mislabeling Postgres
              latency as cache latency.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      {/* E. Observability */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Observability</h2>
      </div>

      <CapabilityCard
        what="Measures and stores real performance data for every relevant API request — never simulated or hand-typed numbers."
        why="You can't tell whether caching actually helped without measuring the system that's really running, not a model of it."
        how="A single plugin times every request, records whether it was served from cache, logs a structured line, and stores the result — without slowing down the response the caller already received."
        path="apps/api/src/observability/request-context.plugin.ts"
      />

      <Card>
        <CardContent>
          <ObservabilityFlowDiagram />
          <p className="mt-4 text-sm leading-6 text-muted">
            Every relevant API request produces an observable record containing
            information such as route, method, duration, status, and cache
            status.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Health, metrics, benchmark, and cache-admin requests are excluded
            from normal request metrics because including them would distort the
            application&apos;s own performance measurements.
          </p>
          <TechnicalDetails>
            <p>
              Persistence is deliberately not awaited — it happens in
              Fastify&apos;s{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                onResponse
              </code>{" "}
              hook, timed with{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                process.hrtime.bigint()
              </code>
              ; a failed insert is logged and discarded, never turned into an
              error on an already-completed request. Excluded routes:{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                /api/health
              </code>
              ,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                /api/metrics/*
              </code>
              ,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                /api/benchmarks/*
              </code>
              ,{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                /api/cache/*
              </code>
              . Aggregation for{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                GET /api/metrics/summary
              </code>{" "}
              happens in PostgreSQL itself (
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                percentile_cont
              </code>
              , linear interpolation) — a different percentile method than the
              benchmark engine&apos;s nearest-rank, deliberately: one is a live
              aggregate over an ever-growing table, the other a fixed array from
              one run.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      {/* F. Performance Lab */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Performance Lab
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          It measures how the same product read behaves with and without the
          Redis-backed cache.
        </p>
      </div>

      <CapabilityCard
        what="Runs real, in-process measurements comparing a direct database read against the same cache-aside path the live API uses."
        why="Claims about caching improving performance should be backed by real, reproducible numbers from this codebase — not an assumption."
        how="Three modes call the exact same repository/service code the real routes use, timed directly around that call, and persist the result as a BenchmarkRun."
        path="apps/api/src/services/benchmark.service.ts"
      />

      <Card>
        <CardContent>
          <BenchmarkFlowDiagram />
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <Term
              word="DB_ONLY"
              definition="reads PostgreSQL directly, bypassing the cache entirely."
            />
            <Term
              word="CACHE_ONLY"
              definition="uses the same cache-aside service path the real API uses."
            />
            <Term
              word="COMPARISON"
              definition="runs both paths against the same target and computes the difference."
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <Term
              word="Percentile"
              definition="a way of describing latency distribution, such as the response time at the 95th percentile."
            />
            <Term
              word="Average latency"
              definition="the typical request duration."
            />
            <Term
              word="P95 / P99"
              definition="the latency below which approximately 95% / 99% of measured requests fall."
            />
            <Term
              word="Throughput"
              definition="how many operations can be completed per second."
            />
          </div>
          <TechnicalDetails>
            <p>
              Benchmarks run entirely in-process — no HTTP loopback — because
              looping real HTTP requests would measure Node&apos;s own network
              stack as much as the thing being compared. Percentiles use the
              nearest-rank method (always an actual observed sample, never
              interpolated); concurrency is a small, bounded worker pool
              (default 1, capped at 20). Benchmarks are read-only against
              product data — never create/update/delete — and a failed run never
              creates a{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                BenchmarkRun
              </code>{" "}
              row.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      {/* G. Frontend architecture */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Frontend architecture
        </h2>
      </div>

      <CapabilityCard
        what="A full Next.js App Router application — dashboard, Performance Lab, Cache Explorer, API Explorer, System Health, Architecture, and Documentation — all consuming the real API."
        why="Every page should show real data with honest loading/empty/error states, never a fabricated placeholder."
        how="Next.js renders the app shell and pages; every data fetch goes through lib/api/*, which validates the response against a shared contract before any page ever sees it."
        path="apps/web"
      />

      <Card>
        <CardContent>
          <FrontendArchitectureDiagram />
          <TechnicalDetails>
            <p>
              TanStack Query drives data fetching: 5s polling for the
              dashboard/cache explorer, 10s for health, on-demand (mutations)
              for the Performance Lab and API Explorer. Errors are normalized
              once (
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                lib/api/error-message.ts
              </code>
              ) into a message every page can show directly. The API
              Explorer&apos;s endpoint catalog is hand-curated, not generated.
              Cache Explorer additionally cross-checks{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                GET /api/health
              </code>{" "}
              for Redis&apos;s real state, since{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                GET /api/cache/stats
              </code>{" "}
              fails open to a successful response with all-zero counters when
              Redis is down.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      {/* H. API contracts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">API contracts</h2>
      </div>

      <ContractValidationDiagram />

      {/* I. Engineering boundaries */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Why the code is separated this way
        </h2>
        <div className="mt-4">
          <EngineeringBoundaries />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          This separation prevents database code from leaking into controllers,
          prevents repositories from becoming cache-aware, and keeps cache-kit
          reusable outside CacheForge.
        </p>
      </div>

      {/* J / K. Deep reference */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Full source-of-truth documentation
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Every fact above comes from this file. Expand any{" "}
          <span className="font-medium text-foreground">
            Implementation details
          </span>{" "}
          panel for exact file paths and edge cases, or read the complete
          write-up below.
        </p>
      </div>
      <Card>
        <CardContent>
          <MarkdownContent content={content} />
        </CardContent>
      </Card>
    </div>
  );
}
