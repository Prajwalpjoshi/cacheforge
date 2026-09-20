import type { StatusDescriptor } from "@/lib/status";
import { Badge } from "./badge";

/** Renders a StatusDescriptor (label + tone + icon) as one badge — icon and text always accompany color, per PROJECT_SPEC.md #13's "color is never the sole signal." */
export function StatusBadge({
  descriptor,
  className,
}: {
  descriptor: StatusDescriptor;
  className?: string;
}) {
  const Icon = descriptor.icon;
  return (
    <Badge tone={descriptor.tone} className={className}>
      <Icon aria-hidden="true" className="size-3.5" />
      <span>{descriptor.label}</span>
    </Badge>
  );
}
