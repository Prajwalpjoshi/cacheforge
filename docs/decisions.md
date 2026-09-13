# Decisions

ADR-style log of decisions actually made during the build, in the format
Context / Decision / Reason / Trade-off. See `PROJECT_SPEC.md` §25 for
the architectural risk/trade-off table decided up front, before any code
existed. This file captures decisions made *while implementing*.

## 2026-09-13 — pnpm via global npm install, not Corepack shims

**Context:** `PROJECT_SPEC.md` and the Phase 1 plan call for enabling
pnpm through Corepack rather than a separate global install.
**Decision:** `corepack enable` failed with `EPERM` (it tries to write
shims into `C:\Program Files\nodejs`, which requires admin rights on this
machine). Installed pnpm globally via `npm install -g pnpm` instead
(npm's global prefix is user-writable), and still pinned the resolved
version (`pnpm@12.4.1`) in the root `package.json` `packageManager`
field.
**Reason:** Unblocks local development without requiring elevated
permissions; the `packageManager` field still gives Corepack (or CI, or
a machine without this restriction) the exact version to use if enabled
there.
**Trade-off:** On this machine, `packageManager` is not actively
enforced by Corepack the way it would be if the shims had installed
successfully — a contributor could run a mismatched pnpm version without
being blocked. Acceptable for a single-developer portfolio project;
worth revisiting if this becomes a multi-contributor repo.

## 2026-09-13 — `apps/web` scaffolded via `create-next-app`, not hand-written

**Context:** The installed Next.js version (16.3.5) is newer than the
assistant's training data, and its own generated `AGENTS.md` explicitly
warns that APIs/conventions may have changed.
**Decision:** Used `pnpm create next-app@latest` to scaffold `apps/web`
instead of hand-authoring `package.json`/`tsconfig.json`/config files,
then customized the generated app (landing page, layout, design tokens)
to match `PROJECT_SPEC.md` §13.
**Reason:** Guarantees the generated config is valid for the actual
installed version rather than guessing at a possibly-outdated shape;
the bundled docs (`node_modules/next/dist/docs/`) were read directly to
confirm current App Router conventions (e.g. `LayoutProps<'/'>` route
prop helper types) before writing page/layout code.
**Trade-off:** None significant — this is standard practice, and the
generated boilerplate not needed for CacheForge (default demo page,
unused SVGs) was removed.

## 2026-09-13 — Cache Components (`cacheComponents`) left disabled

**Context:** Next.js 16 ships an opt-in "Cache Components" model
(`'use cache'` directive, `cacheComponents: true` in `next.config.ts`)
for caching data/UI at the framework level.
**Decision:** Left disabled for CacheForge.
**Reason:** CacheForge's dashboard pages (metrics, health, cache
explorer) need to reflect current backend/Redis state on every load;
Next's own render-level caching is a different concern from the Redis
cache-aside story this project is about, and enabling it would risk the
dashboard silently showing stale data. Data freshness here is handled by
TanStack Query polling once those pages exist (`PROJECT_SPEC.md` §12),
not by Next's cache.
**Trade-off:** Forgoes some of Next 16's prerendering/performance
benefits on largely-static pages (Landing, Architecture, Docs); an
acceptable cost given those pages are a small fraction of the app.
