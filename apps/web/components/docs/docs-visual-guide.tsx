import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComponentRoles } from "@/components/architecture/component-roles";
import { SystemDiagram } from "@/components/diagrams/system-diagram";
import {
  WithCacheAsideDiagram,
  WithoutCachingDiagram,
} from "@/components/diagrams/cache-aside-comparison";
import { WriteInvalidationDiagram } from "@/components/docs/write-invalidation-diagram";
import { RateLimitDiagram } from "@/components/docs/rate-limit-diagram";
import { ObservabilityDiagram } from "@/components/docs/observability-diagram";
import { ResilienceDiagram } from "@/components/docs/resilience-diagram";
import { TechnicalDetails } from "@/components/docs/technical-details";

/**
 * An interactive, visual "how CacheForge works" guide that sits above the
 * raw markdown documentation on the Getting Started tab. Every diagram
 * reuses the same primitives (SystemDiagram/FlowDiagram/BranchDiagram/
 * cache-aside comparison) already rendered on /architecture and the
 * marketing page — nothing here invents a new diagramming approach, and
 * every fact quoted in a "Technical details" panel is drawn from
 * docs/architecture.md, docs/caching.md, and docs/performance.md. This
 * does not replace those files — see the documentation table below for
 * the full prose, and each tab's own markdown for anything not visualized
 * here.
 */
export function DocsVisualGuide() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          How CacheForge Works
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          A visual tour of the architecture, caching flow, and failure
          handling — for the full prose write-up, keep reading below or open{" "}
          <Link href="/docs?doc=architecture" className="text-accent hover:underline">
            Architecture
          </Link>
          ,{" "}
          <Link href="/docs?doc=caching" className="text-accent hover:underline">
            Caching
          </Link>
          , and{" "}
          <Link href="/docs?doc=performance" className="text-accent hover:underline">
            Observability &amp; Benchmarks
          </Link>
          .
        </p>
      </div>

      <Card id="how-it-works">
        <CardHeader>
          <CardTitle>System overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <SystemDiagram animated />
          <p className="mt-4 text-xs text-muted">
            Every request flows Browser → Next.js → Fastify API, which reads
            and writes PostgreSQL directly. Redis sits alongside it as an
            optional performance layer — the API is always correct without
            it, only slower.
          </p>
          <TechnicalDetails summary="Component roles">
            <ComponentRoles />
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card id="cache-aside">
        <CardHeader>
          <CardTitle>Cache-aside in one glance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <div className="flex flex-col gap-4">
            <WithoutCachingDiagram />
            <WithCacheAsideDiagram />
          </div>
          <p className="mt-4 text-xs text-muted">
            Reads check Redis first. A{" "}
            <strong className="text-foreground">HIT</strong> returns
            immediately with no database call; a{" "}
            <strong className="text-foreground">MISS</strong> queries
            PostgreSQL, repopulates Redis, then returns — so Redis can never
            hold data PostgreSQL doesn&apos;t also have.
          </p>
          <TechnicalDetails>
            <div className="flex flex-col gap-1 font-mono text-xs text-foreground">
              <span>GET /api/products/:id</span>
              <span>Redis key: cacheforge:product:{"{id}"}</span>
              <span>TTL: 60s</span>
            </div>
            <p className="mt-3">
              Paginated/filtered list reads use{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cacheforge:products:list:*
              </code>{" "}
              with a 30s TTL and are invalidated via a tracked tag set on any
              product write, rather than by guessing which list keys a write
              might affect.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card id="write-invalidation">
        <CardHeader>
          <CardTitle>Write &amp; invalidation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <WriteInvalidationDiagram />
          <TechnicalDetails>
            <p>
              Verified in{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                test/product-events.integration.test.ts
              </code>
              : publishing only ever happens after the database mutation has
              committed, so a rejected write never emits a{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cacheforge:events
              </code>{" "}
              message or touches the cache.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card id="rate-limiting">
        <CardHeader>
          <CardTitle>Rate limiting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <RateLimitDiagram />
          <TechnicalDetails>
            <p>
              A fixed-window counter (
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                INCR cacheforge:ratelimit:read|write:{"{ip}"}:{"{windowStart}"}
              </code>
              ) in Redis, chosen over sliding-window/token-bucket as the
              simplest scheme that&apos;s still correct and fully
              explainable. Its one known trade-off — up to ~2x burst exactly
              at a window boundary — is documented rather than hidden.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card id="observability">
        <CardHeader>
          <CardTitle>Observability &amp; benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <ObservabilityDiagram />
          <TechnicalDetails>
            <p>
              Metric persistence is fire-and-forget from Fastify&apos;s{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                onResponse
              </code>{" "}
              hook, so it can never add latency the caller experiences.{" "}
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
              , and{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                /api/cache/*
              </code>{" "}
              are excluded from persistence as self-monitoring noise (still
              logged, just not stored).
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card id="resilience">
        <CardHeader>
          <CardTitle>Resilience — Redis failure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Understand it
          </p>
          <ResilienceDiagram />
          <TechnicalDetails>
            <p>
              Every Redis operation in{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cache-kit
              </code>{" "}
              is wrapped so an unreachable or erroring Redis degrades to
              &quot;go to the source&quot; instead of throwing back at the
              caller. This was verified against a real Docker Redis
              container (stopped mid-run), not mocked — see{" "}
              <Link href="/docs?doc=caching" className="text-accent hover:underline">
                Caching
              </Link>{" "}
              for the full verification log.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>
    </div>
  );
}
