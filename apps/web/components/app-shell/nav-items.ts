import {
  Activity,
  BookOpen,
  Boxes,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/performance", label: "Performance Lab", icon: Gauge },
  { href: "/cache", label: "Cache Explorer", icon: Boxes },
  { href: "/api-explorer", label: "API Explorer", icon: Activity },
  { href: "/health", label: "System Health", icon: HeartPulse },
  { href: "/architecture", label: "Architecture", icon: Network },
  { href: "/docs", label: "Documentation", icon: BookOpen },
];
