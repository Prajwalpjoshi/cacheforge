import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/performance", label: "Performance Lab" },
  { href: "/architecture", label: "Architecture" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-2.5">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm font-semibold tracking-tight"
        >
          <Box aria-hidden="true" className="size-4 text-accent" />
          <span>
            <span className="text-foreground">Cache</span>
            <span className="text-accent">Forge</span>
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {PRIMARY_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/dashboard">
              Open Dashboard
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
