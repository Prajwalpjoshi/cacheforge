# Architecture

> Status: **Phase 1 (foundation)**. This document will be filled in as
> each layer is actually built. See `PROJECT_SPEC.md` §6 for the full,
> target architecture diagram and rationale — nothing below should
> contradict it.

## What exists today

- `apps/api`: a Fastify server with CORS, Helmet, structured Pino
  logging, a request-ID/duration observability hook, a global error
  handler, and a single real endpoint: `GET /api/health` (process
  liveness only — no Postgres/Redis checks yet).
- `apps/web`: a Next.js App Router shell with the landing page and shared
  layout/typography/color tokens. No data-fetching pages yet.
- `packages/contracts`: a Zod schema for the health response, shared by
  both apps.
- `packages/cache-kit`: package scaffold only — no cache/rate-limit/
  pub-sub implementation yet.
- `docker-compose.yml`: local PostgreSQL and Redis, not yet wired into
  the API.

## What's not built yet

Prisma models and migrations, the product catalog, Redis caching,
rate limiting, pub/sub, the metrics pipeline, the Performance Lab, the
Cache Explorer, the API Explorer, and the remaining dashboard pages.
These follow the phased plan in `PROJECT_SPEC.md` §24.
