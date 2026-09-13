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
  },
});
