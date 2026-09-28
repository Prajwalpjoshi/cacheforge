import Link from "next/link";
import type { ReactNode } from "react";
import { Box } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { SystemStatusPill } from "./system-status-pill";
import { ApiConnectionStatus } from "./api-connection-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { version as appVersion } from "../../package.json";

/**
 * The internal application shell — deliberately a Server Component.
 * Only the pieces that need interactivity (active-route highlighting,
 * the mobile drawer, the polled status pill) are Client Components;
 * navigating between /dashboard, /performance, etc. never has to
 * re-render this wrapper (PROJECT_SPEC.md #6/#21).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    // The page/document is the one scroll container — `aside` is
    // `position: fixed` (not sticky+stretch) so it's pinned to the
    // viewport independently of document height, with nothing for the
    // page and a nested container to both end up scrollable at once.
    <div className="flex min-h-svh flex-col">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:fixed md:inset-y-0 md:left-0 md:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 border-b border-border px-5 py-4 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Box aria-hidden="true" className="size-4" />
          </span>
          CacheForge
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <ApiConnectionStatus />
            <ThemeToggle />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            CacheForge v{appVersion}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-60">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:hidden">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Box aria-hidden="true" className="size-3.5" />
            </span>
            CacheForge
          </Link>
          <div className="flex items-center gap-2">
            <SystemStatusPill />
            <ThemeToggle />
            <MobileNav />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
