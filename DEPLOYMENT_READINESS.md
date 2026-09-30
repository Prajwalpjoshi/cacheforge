# CacheForge — Deployment Readiness

> **Post-deployment update:** production deployment has since been
> performed, using the providers this audit evaluated (API on Render,
> PostgreSQL on Neon, Redis on Upstash, frontend on Netlify). See the
> README's "Status" and "Deployment architecture" sections for the
> current, live state. The audit below is left as originally written —
> it documents the pre-deployment verification that was actually
> performed, at the point in time before deployment.

Produced during **Phase 6 (deployment readiness verification)**. This
is a pre-deployment audit, not a deployment record — at the time it
was written, no cloud infrastructure had been created and nothing had
been deployed. Every claim below was actually verified against a real,
local build/run of the application (production builds, `node
dist/server.js`, `next start`, and the local Docker PostgreSQL/Redis
containers), not assumed. See the Phase 6 report (delivered alongside
this file) for the full evidence trail.

## Readiness classification

| Area                                             | Status                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| Build (lint/typecheck/format/test/build)         | READY                                                                    |
| Production start (API + web)                     | READY                                                                    |
| Environment configuration                        | READY                                                                    |
| Docker (local Postgres/Redis)                    | READY                                                                    |
| PostgreSQL (incl. fresh-DB migration)            | READY                                                                    |
| Redis (incl. TLS/managed-provider compatibility) | READY                                                                    |
| CORS                                             | READY                                                                    |
| HTTPS assumptions                                | READY                                                                    |
| API health endpoint                              | READY                                                                    |
| Rate limiting                                    | READY WITH NOTES (defaults are placeholders — see below)                 |
| Metrics durability                               | READY WITH NOTES (documented fire-and-forget limitation)                 |
| Benchmark/public-API abuse surface               | READY WITH NOTES (no auth; rate-limit-only mitigation, by design)        |
| Frontend deployment compatibility (file tracing) | READY (fixed this phase — see below)                                     |
| Security review (secrets, headers, validation)   | READY WITH NOTES                                                         |
| Dependency audit                                 | READY WITH NOTES (3 transitive, unreachable CLI-tooling vulnerabilities) |
| Documentation                                    | READY                                                                    |
| Browser/interactive verification                 | NOT AVAILABLE (no headless browser tool in this environment)             |
| Deployment itself                                | NOT EXECUTED (out of scope for this phase)                               |

## Before deployment

- [ ] **Environment variables** — set on each provider (see README's Environment Variables table for the full list):
  - API: `NODE_ENV=production`, `PORT` (provider-assigned on most PaaS), `CORS_ORIGIN=<deployed frontend origin>`, `DATABASE_URL`, `REDIS_URL`, rate-limit vars (review defaults first).
  - Web: `NEXT_PUBLIC_API_URL=<deployed API origin>` — **must be set at build time**, not just runtime (Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle).
- [ ] **Provider configuration** — pick and provision (not done in this phase): a PostgreSQL 16+ instance (e.g. Neon, Render Postgres), a Redis 7+ instance (e.g. Upstash — TLS via `rediss://` works with zero code changes), a Node host for `apps/api` (e.g. Render — no Dockerfile exists, so use a native Node buildpack/build command `pnpm --filter @cacheforge/api build`, start command `pnpm --filter @cacheforge/api start`), and a Next.js host for `apps/web` (e.g. Vercel, with the monorepo's `apps/web` as the project root).
- [ ] **Database migration** — run `pnpm --filter @cacheforge/api db:migrate:deploy` against the production database before the API's first deploy. Verified in this phase against a genuinely fresh, empty PostgreSQL database (not the dev database) — see below.
- [ ] **Redis configuration** — no code change required; just set `REDIS_URL` to the managed provider's full connection string (including its `rediss://` scheme and credentials, if TLS/auth is required).
- [ ] **CORS origin** — set the API's `CORS_ORIGIN` to the exact deployed frontend origin before real traffic arrives from it. A wildcard/unrestricted origin is not used anywhere in this codebase and should not be introduced.
- [ ] **Frontend API URL** — set `NEXT_PUBLIC_API_URL` in the frontend host's build-time environment configuration to the deployed API's public origin.
- [ ] **Build verification** — re-run `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build` immediately before the deploy that will actually ship, since this audit's results are a snapshot as of the commit noted in the Phase 6 report.
- [ ] **Rate-limit defaults** — review `RATE_LIMIT_MAX`/`RATE_LIMIT_WRITE_MAX`/`RATE_LIMIT_WINDOW_SECONDS` against expected real traffic; the shipped defaults (300 reads / 60 writes per 60s per IP) are local-dev-appropriate placeholders, not a production traffic study.

## During deployment

- **Frontend:** deploy `apps/web` with `NEXT_PUBLIC_API_URL` set in the build environment. Confirm the build completes without the Turbopack file-tracing warning that existed before this phase's fix (`apps/web/lib/docs.ts` now reads from a project-local `content/` directory populated by `scripts/copy-docs.mjs`).
- **API:** deploy `apps/api` with `NODE_ENV=production` and all required env vars set. Confirm the process starts and binds successfully (the app already binds `0.0.0.0`, which is correct for a hosted container/VM).
- **Database:** run `db:migrate:deploy` as a release step (a Render deploy hook, or a manual one-time step) before the new API version starts serving traffic.
- **Redis:** no explicit provisioning step beyond setting `REDIS_URL` — the API tolerates Redis being briefly unavailable at startup (fails open, `/api/health` reports `degraded` rather than crashing).
- **Health checks:** point the hosting platform's health check at `GET /api/health`. It returns `503` only when PostgreSQL is unreachable (a real outage) and `200` with `status: "degraded"` when only Redis is down (the app is still fully able to serve traffic from PostgreSQL) — configure the platform's health check to treat only the `503` case as unhealthy, not `degraded`.

## After deployment

Smoke tests to run against the real deployed URLs (not yet executed — this phase deliberately stopped short of deploying):

- [ ] `GET /api/health` returns `200`/`ok`.
- [ ] Create a product, read it twice, confirm `x-cache-status: MISS` then `HIT`.
- [ ] Update the product, read it again, confirm `x-cache-status: MISS` (invalidation worked).
- [ ] `GET /api/metrics/summary` reflects the traffic just generated.
- [ ] Run a small `COMPARISON` benchmark (`iterations: 10-20`) and confirm it completes and appears in `GET /api/benchmarks`.
- [ ] Open the Cache Explorer, confirm real keys are listed, delete one, confirm it disappears.
- [ ] Exceed the write rate limit deliberately (e.g. by scripting >60 writes in under a minute) and confirm a `429` with `Retry-After`.
- [ ] Stop/pause the managed Redis instance if the provider supports it safely, confirm `/api/health` degrades and reads still succeed (`BYPASS`), then restore it.

## Rollback

No provider-specific rollback commands are documented here because no
provider has been provisioned or verified against in this phase —
documenting an unverified command would violate this phase's own
"do not claim untested instructions" rule. In general terms, appropriate
for the architecture above:

- **Frontend (Vercel-style):** re-promote the previous deployment/build to production — these platforms keep prior builds addressable and typically support instant rollback without a rebuild.
- **API (Render-style):** redeploy the previous known-good commit/image; if a migration was part of the failed deploy and it only added tables/columns (as this project's single migration does), rolling back the API code without rolling back the schema is safe. A migration that had removed or renamed a column would need a corresponding down-migration reviewed before rollback — not a scenario this project's current single migration presents.
- **Database:** Prisma does not auto-generate down-migrations; a genuine schema rollback would require a hand-written reverse migration, reviewed before applying. Not needed for this project's current single, additive migration.

## Evidence: fresh-database migration test

Performed locally (no cloud database used): created a new, genuinely
empty database in the same local Docker PostgreSQL container
(`CREATE DATABASE cacheforge_migration_test`), ran
`DATABASE_URL=... prisma migrate deploy` against it, confirmed all
three tables (`Product`, `RequestMetric`, `BenchmarkRun`) and their
enums were created correctly with the exact expected columns, then
dropped the test database. This is real evidence that the committed
migration set can initialize a production database from nothing — it
is not inferred from the long-lived development database matching
`prisma migrate status`'s "up to date," though that was also checked
and confirmed.

## Known, accepted risks (not blockers)

- **No authentication on destructive/expensive endpoints** — `POST`/`PUT`/`DELETE /api/products*`, `DELETE /api/cache/:key`, and `POST /api/benchmarks/run` are protected only by Zod validation and per-IP rate limiting. This is an explicit, pre-existing design trade-off (PROJECT_SPEC.md §25) for a single-operator portfolio deployment, re-confirmed as still accurate in this audit — not something Phase 6 introduced or is authorized to fix by adding auth.
- **Benchmark abuse surface** — `POST /api/benchmarks/run` is bounded (max 1000 iterations, max 20 concurrency, Zod-validated, rejected not clamped) and rate-limited under the write limiter (60/window/IP by default), but a sustained abusive client could still drive up to that many DB/Redis operations per window. Acceptable for a portfolio deployment's expected traffic; would need a stricter, dedicated limit before any traffic assumption changes.
- **Dependency audit** — `pnpm audit` reports 2 high + 1 moderate advisory, all transitive through the `prisma` CLI package's own dependency tree (`deepmerge-ts`, `mysql2` — CacheForge uses only `@prisma/adapter-pg`/PostgreSQL, never MySQL, and the `prisma` package itself is a dev/build-time tool, not part of the running production server). None are reachable from this application's actual runtime code paths. Not treated as a blocker; worth re-checking after a future non-RC Prisma patch release.
- **Metrics durability** — a process crash between "response sent" and "metric row inserted" loses that one row (fire-and-forget by design, documented in `docs/decisions.md`). Acceptable for aggregate-trend observability; would block a use case requiring audit-grade completeness.

## Fixed during this phase

- `apps/web/lib/docs.ts` previously read `README.md`/`docs/*.md` from two directories above `apps/web` at request time, which made Next's output-file tracer fall back to tracing the entire monorepo into the `/docs` route (a real risk on a serverless platform with a function-size limit). Now reads from a project-local, git-ignored `apps/web/content/` directory populated by `apps/web/scripts/copy-docs.mjs` (run via `predev`/`prebuild`) — verified: a clean rebuild now produces zero Turbopack warnings (previously exactly one).
- Added `apps/api`'s missing `db:migrate:deploy` script (`prisma migrate deploy`) — PROJECT_SPEC.md §18 already called for this exact command as the production migration step, but no script existed for it; only the dev-only `prisma migrate dev` was present.
