import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { MobileNav } from "./mobile-nav";
import { SystemStatusPill } from "./system-status-pill";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The internal application shell — deliberately a Server Component.
 * Only the pieces that need interactivity (active-route highlighting,
 * the mobile drawer, the polled status pill) are Client Components;
 * navigating between /dashboard, /performance, etc. never has to
 * re-render this wrapper (PROJECT_SPEC.md #6/#21).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 border-b border-border px-5 py-4 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          CacheForge
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <SystemStatusPill />
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:hidden">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-tight text-foreground"
          >
            CacheForge
          </Link>
          <div className="flex items-center gap-2">
            <SystemStatusPill />
            <ThemeToggle />
            <MobileNav />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
