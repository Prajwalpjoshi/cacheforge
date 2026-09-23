# CacheForge — Architecture Diagrams

Companion to `docs/TECHNICAL_ARCHITECTURE.md`. Every diagram here matches
the implementation as of this audit — file/function citations are in the
main document; this file is diagrams only. Rendered with Mermaid where
practical (GitHub and most editors render these natively).

---

## 1. High-level architecture

```mermaid
flowchart TB
    Browser["Browser"]

    subgraph FE["apps/web — Next.js 16 (App Router)"]
        Web["Dashboard UI\nTanStack Query + Recharts"]
    end

    subgraph BE["apps/api — Fastify 5"]
        RL["Rate limiter\n(onRequest hook)"]
        Routes["Routes / Controllers"]
        Services["Services\n(product, benchmark, cache-admin, health, metrics)"]
        CK["cache-kit\n(cache-aside, rate limiter, pub/sub)"]
        Obs["Observability hook\n(request-context.plugin.ts)"]
    end

    subgraph Data["Data Layer"]
        Redis[("Redis 7")]
        PG[("PostgreSQL 16")]
    end

    Contracts["packages/contracts\n(shared Zod schemas)"]

    Browser -->|HTTPS| Web
    Web -->|REST/JSON| RL
    RL --> Routes
    Routes --> Services
    Services --> CK
    CK -->|GET/SET, tags, INCR/EXPIRE, PUBLISH| Redis
    Services -->|Prisma| PG
    Routes --> Obs
    Obs -->|fire-and-forget| PG
    Contracts -.-> Web
    Contracts -.-> Routes
```

## 2. Frontend architecture

```mermaid
flowchart TB
    Root["app/layout.tsx\n(fonts, TanStack QueryClientProvider)"]

    subgraph Marketing["(marketing) route group"]
        Landing["/ — Landing page\nSiteHeader/SiteFooter"]
    end

    subgraph AppGroup["(app) route group — wrapped in AppShell"]
        Dashboard["/dashboard"]
        Perf["/performance"]
        Cache["/cache"]
        Explorer["/api-explorer"]
        Health["/health"]
        Arch["/architecture"]
        Docs["/docs"]
    end

    Root --> Marketing
    Root --> AppGroup

    subgraph Shell["components/app-shell/app-shell.tsx"]
        Sidebar["SidebarNav (desktop)"]
        Mobile["MobileNav drawer"]
        Pill["SystemStatusPill\n(polls GET /api/health, 10s)"]
    end

    AppGroup --> Shell

    subgraph DataLayer["lib/api/*.ts"]
        Client["apiRequest<T>()\nvalidates against @cacheforge/contracts"]
    end

    Dashboard --> DataLayer
    Perf --> DataLayer
    Cache --> DataLayer
    Health --> DataLayer
    Explorer -->|"raw fetch, bypasses schema validation"| ExecReq["lib/api-explorer/execute-request.ts"]
    Docs -->|"server-side fs read, no API call"| DocsLib["lib/docs.ts → apps/web/content/"]

    Client -->|fetch| API["Fastify API"]
    ExecReq -->|fetch| API
```

## 3. Backend architecture (layering)

```mermaid
flowchart LR
    subgraph Routes["Routes (*.route.ts)"]
        R1["Fastify + Zod schema attachment"]
    end
    subgraph Controllers["Controllers (*.controller.ts)"]
        C1["HTTP ⇄ service translation\nsets x-cache-status header"]
    end
    subgraph Services["Services (*.service.ts)"]
        S1["Business logic\ncache-aside decisions\ninvalidation + pub/sub triggers\nPrisma error → domain error mapping"]
    end
    subgraph Repos["Repositories (*.repository.ts)"]
        Rp1["Prisma queries only\nno caching awareness"]
    end
    subgraph CacheKit["packages/cache-kit"]
        Ck1["createCache / createRateLimiter\ncreatePubSub / createRedisClient"]
    end

    Routes --> Controllers --> Services
    Services --> Repos --> PG[("PostgreSQL")]
    Services --> CacheKit --> Redis[("Redis")]
```

## 4. Product read flow (`GET /api/products/:id`)

```mermaid
sequenceDiagram
    participant Browser
    participant Next as Next.js
    participant Fastify as Route/Controller
    participant Svc as ProductService
    participant Cache as cache-kit
    participant Repo as ProductRepository
    participant PG as PostgreSQL

    Browser->>Next: navigate / query fires
    Next->>Fastify: GET /api/products/:id
    Fastify->>Svc: getById(id)
    Svc->>Cache: getOrSet(cacheforge:product:{id}, 60s, fetcher)
    alt cache hit
        Cache-->>Svc: {value, status:"hit"}
    else miss (Redis up) or bypass (Redis down)
        Cache->>Repo: fetcher() → findById(id)
        Repo->>PG: SELECT ... WHERE id = ?
        PG-->>Repo: row or null
        Repo-->>Cache: row (throws NotFoundError if null)
        Cache->>Cache: SET key EX 60 (skipped if Redis unreachable)
        Cache-->>Svc: {value, status:"miss"|"bypass"}
    end
    Svc-->>Fastify: product + cacheStatus
    Fastify-->>Browser: 200 + x-cache-status header
    Fastify--)PG: fire-and-forget RequestMetric insert (onResponse)
```

## 5. Product write flow (`POST` / `PUT` / `DELETE`)

```mermaid
sequenceDiagram
    participant Browser
    participant Fastify as Route/Controller
    participant Svc as ProductService
    participant Repo as ProductRepository
    participant PG as PostgreSQL
    participant Cache as cache-kit
    participant PubSub as cache-kit pub/sub

    Browser->>Fastify: POST/PUT/DELETE /api/products[/:id]
    Fastify->>Svc: create/update/delete
    Svc->>Repo: repository call
    Repo->>PG: INSERT/UPDATE/DELETE
    alt Prisma error (P2002/P2025)
        PG-->>Repo: error
        Repo-->>Svc: throws
        Svc-->>Fastify: ConflictError(409) / NotFoundError(404) — no invalidation, no publish
    else success
        PG-->>Repo: committed row
        Repo-->>Svc: row
        Svc->>Cache: delete(product key) [update/delete only]
        Svc->>Cache: invalidateTag(list tag) [always]
        Svc->>PubSub: publish(cacheforge:events, {type, payload, at})
        Svc-->>Fastify: result
    end
    Fastify-->>Browser: 201/200/204 or 409/404
```

## 6. Cache-aside flow

```mermaid
flowchart TD
    Start["cache.getOrSet(key, ttl, fetcher, tags?)"] --> Get["Redis GET key"]
    Get -->|value found| Hit["status: hit\nreturn cached value\n(Postgres untouched)"]
    Get -->|no value, Redis reachable| Miss["fetcher() → read Postgres"]
    Get -->|Redis GET itself failed| Bypass["fetcher() → read Postgres"]
    Miss --> SetM["Redis SET key EX ttl\n(+ SADD tag if provided)"]
    SetM --> ReturnMiss["status: miss\nreturn value"]
    Bypass --> SetB["SET attempted, also fail-open"]
    SetB --> ReturnBypass["status: bypass\nreturn value"]
```

## 7. Cache invalidation (tag-set mechanism)

```mermaid
flowchart LR
    subgraph Write["Every list-cache SET"]
        W1["SET cacheforge:products:list:{hash} EX 30"]
        W2["SADD cacheforge:products:list:keys {hash-key}"]
        W1 --> W2
    end

    subgraph Invalidate["On any product create/update/delete"]
        I1["SMEMBERS cacheforge:products:list:keys"]
        I2["DEL <every member> (if any)"]
        I3["DEL cacheforge:products:list:keys"]
        I1 --> I2 --> I3
    end

    subgraph PerItem["update/delete only"]
        P1["DEL cacheforge:product:{id}"]
    end
```

## 8. Metrics flow

```mermaid
flowchart TD
    Req["Any /api/* request"] --> Start["onRequest: request.startTime = hrtime()"]
    Start --> Handle["Route → Controller → Service → Cache/Repo"]
    Handle --> Send["onSend: set x-request-id header"]
    Send --> Client["Response sent to client"]
    Client --> OnResp["onResponse hook fires (after response sent)"]
    OnResp --> Log["Always: structured completion log"]
    OnResp --> Check{"shouldPersistMetricForRoute(route)?"}
    Check -->|"/api/health, /api/metrics/*,\n/api/benchmarks/*, /api/cache/* → no"| Skip["Not persisted"]
    Check -->|"/api/products* → yes"| Insert["Fire-and-forget:\nfastify.metricsService.record(...)"]
    Insert --> PG[("RequestMetric table")]
```

## 9. Benchmark flow

```mermaid
flowchart TD
    Config["User configures run\n(targetRoute, mode, iterations, concurrency)"] --> Post["POST /api/benchmarks/run\n(Zod-validated: iterations ≤1000, concurrency ≤20)"]
    Post --> Redis503{"mode ≠ DB_ONLY?"}
    Redis503 -->|yes| Ping["ensureRedisAvailable()"]
    Ping -->|unreachable| Err503["503 ServiceUnavailableError"]
    Redis503 -->|no or Redis OK| Ctx["resolveWorkloadContext(targetRoute)"]
    Ctx -->|"products.get, no rows exist"| Err400["400 BadRequestError"]
    Ctx --> Mode{"mode"}
    Mode -->|DB_ONLY| DbOnly["runWithConcurrency → productRepository.findById/list"]
    Mode -->|CACHE_ONLY| Warm["warmCacheFromCold()\n(explicit invalidate before iteration 1)"]
    Warm --> CacheOnly["runWithConcurrency → productService.getById/list"]
    Mode -->|COMPARISON| Both["DB_ONLY run, then CACHE_ONLY run\n(same target)"]
    DbOnly --> Stats["percentiles (nearest-rank) + throughput (iterations / wallClockSeconds)"]
    CacheOnly --> Stats
    Both --> Stats
    Stats --> Persist["BenchmarkRun row persisted\n(ONE row even for COMPARISON)"]
    Persist --> PG[("PostgreSQL")]
    PG --> UI["Performance Lab UI"]
```

## 10. Failure handling

```mermaid
flowchart TD
    subgraph RedisDown["Redis unavailable"]
        RD1["/api/health → 200, {status:degraded, redis:down}"]
        RD2["Cache reads → BYPASS (Postgres still serves the request)"]
        RD3["Cache writes / invalidation / pub-sub → fail open (logged warning)"]
        RD4["Rate limiting → fails open (request allowed)"]
        RD5["Benchmark CACHE_ONLY/COMPARISON → 503 (deliberate exception)"]
    end

    subgraph PGDown["PostgreSQL unavailable"]
        PD1["/api/health → 503, {status:degraded, postgres:down}"]
        PD2["Product routes → real 5xx (no fail-open; Postgres cannot be bypassed)"]
    end
```

## 11. Deployment architecture (target, not yet provisioned)

```mermaid
flowchart LR
    subgraph Client["Browser"]
    end
    subgraph VercelHost["apps/web — e.g. Vercel"]
        Web["Next.js build\n(NEXT_PUBLIC_API_URL baked in at build time)"]
    end
    subgraph APIHost["apps/api — e.g. Render (native Node, no Dockerfile)"]
        API["node dist/server.js\nCORS_ORIGIN = deployed web origin"]
    end
    subgraph PGHost["PostgreSQL 16+ — e.g. Neon"]
        PG[("Managed Postgres\nsslmode=require")]
    end
    subgraph RedisHost["Redis 7+ — e.g. Upstash (optional)"]
        Redis[("Managed Redis\nrediss:// TLS")]
    end

    Client -->|HTTPS| Web
    Web -->|HTTPS + CORS allowlist| API
    API -->|Prisma, TLS| PG
    API -->|node-redis, TLS| Redis
```

**Status: none of the above has been provisioned.** No cloud accounts,
databases, or Redis instances exist for this project yet — see
`DEPLOYMENT_READINESS.md` and `docs/TECHNICAL_ARCHITECTURE.md` §25.
