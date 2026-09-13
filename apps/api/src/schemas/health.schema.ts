// Re-exported from the shared contracts package so route files depend on
// a stable local path; API-only request schemas (no shared FE consumer)
// can be added alongside this one as they're introduced.
export { healthResponseSchema, type HealthResponse } from "@cacheforge/contracts";
