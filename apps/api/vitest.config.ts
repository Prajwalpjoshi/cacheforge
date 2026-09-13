import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    // All apps/api tests currently require real Postgres/Redis
    // (PROJECT_SPEC.md's own instruction for this phase); there are no
    // pure-unit tests yet, so `test:unit` legitimately has nothing to
    // run rather than failing.
    passWithNoTests: true,
    // Every test file shares one real Postgres/Redis instance,
    // including a single global pub/sub channel — running files in
    // parallel lets one file's product writes leak events into
    // another's subscriber. Sequential files trade some speed for full
    // determinism, which matters more for a suite exercising shared
    // external state.
    fileParallelism: false,
  },
});
