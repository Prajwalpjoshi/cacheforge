import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * The marketing/landing experience — deliberately a separate visual
 * identity from the internal AppShell (app/(app)/layout.tsx), even
 * though the project has no authentication: PROJECT_SPEC.md #5 asks
 * for the landing page and the "application" to feel like two
 * distinct experiences.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
