import path from "node:path";
import type { NextConfig } from "next";

// This is a pnpm workspace: apps/web's node_modules contains symlinks
// (workspace packages, the pnpm store) that reach outside this
// directory. Setting the tracing root to the monorepo root is the
// documented fix so Next's output-file tracer follows those symlinks
// correctly instead of defaulting to apps/web as the ceiling.
// (lib/docs.ts's own file read is scoped under apps/web/content/ — see
// scripts/copy-docs.mjs and docs/decisions.md — so it no longer needs
// its own tracing include/exclude entry here.)
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: REPO_ROOT,
};

export default nextConfig;
