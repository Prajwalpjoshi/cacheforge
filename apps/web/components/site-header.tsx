const PLANNED_SECTIONS = [
  "Dashboard",
  "Performance Lab",
  "Cache Explorer",
  "API Explorer",
  "System Health",
  "Architecture",
  "Docs",
];

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          CacheForge
        </span>
        <nav aria-label="Planned sections (not yet available)">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {PLANNED_SECTIONS.map((section) => (
              <li key={section} className="cursor-default select-none">
                {section}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
