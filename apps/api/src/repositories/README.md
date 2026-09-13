# repositories

Reserved for Prisma-backed data access (`Product`, `RequestMetric`,
`BenchmarkRun`), added once the database layer is implemented. See
`PROJECT_SPEC.md` §8 and §14.

Repositories are the only layer permitted to import Prisma; services must
depend on repository functions, never on `@prisma/client` directly.
