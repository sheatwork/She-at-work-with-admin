/*eslint-disable @typescript-eslint/no-unused-vars */
// src/components/dashboard/layout/DashboardSidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FileCheck,
  FolderTree,
  Home,
  Mail,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// UserRole enum values from schema: SUPER_ADMIN | ADMIN | USER
type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
  roles: Role[];
  group: "common" | "admin" | "superadmin";
}

const NAV_ITEMS: NavItem[] = [
  // ── Common ───────────────────────────────────────────────────────────────
  {
    href:  "/dashboard",
    label: "Overview",
    icon:  <Home className="h-5 w-5" />,
    roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    group: "common",
  },
  {
    href:  "/dashboard/settings",
    label: "Settings",
    icon:  <Settings className="h-5 w-5" />,
    roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    group: "common",
  },

  // ── Admin — matches /api/admin/* routes ──────────────────────────────────
  {
    href:  "/dashboard/admin/content",
    label: "Content",
    icon:  <BookOpen className="h-5 w-5" />,
    roles: ["ADMIN", "SUPER_ADMIN"],
    group: "admin",
  },
  {
    href:  "/dashboard/admin/categories",
    label: "Categories",
    icon:  <FolderTree className="h-5 w-5" />,
    roles: ["ADMIN", "SUPER_ADMIN"],
    group: "admin",
  },
  {
    href:  "/dashboard/admin/story-submissions",
    label: "Story Submissions",
    icon:  <TrendingUp className="h-5 w-5" />,
    roles: ["ADMIN", "SUPER_ADMIN"],
    group: "admin",
  },
  {
    href:  "/dashboard/admin/contact-submissions",
    label: "Contact Submissions",
    icon:  <Mail className="h-5 w-5" />,
    roles: ["ADMIN", "SUPER_ADMIN"],
    group: "admin",
  },

  // ── Super Admin — matches /api/superadmin/* routes ───────────────────────
  {
    href:  "/dashboard/superadmin/admins",
    label: "Admin Management",
    icon:  <Shield className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
    group: "superadmin",
  },
  {
    href:  "/dashboard/superadmin/users",
    label: "User Management",
    icon:  <Users className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
    group: "superadmin",
  },
  {
    href:  "/dashboard/superadmin/analytics",
    label: "Analytics",
    icon:  <BarChart3 className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
    group: "superadmin",
  },
];

const GROUP_LABELS: Record<string, string> = {
  common:     "",               // no label — general nav
  admin:      "Administration",
  superadmin: "Super Admin",
};

const ROLE_PANEL: Record<Role, { title: string; description: string }> = {
  SUPER_ADMIN: {
    title:       "Super Admin Panel",
    description: "Full platform control: users, admins, content, and system config.",
  },
  ADMIN: {
    title:       "Administration",
    description: "Manage content, categories, and review community submissions.",
  },
  USER: {
    title:       "User Panel",
    description: "Access your dashboard, profile, and settings.",
  },
};

interface DashboardSidebarProps {
  role: string;
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();

  const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role as Role));

  const groups = (["common", "admin", "superadmin"] as const)
    .map((g) => ({ name: g, items: filtered.filter((i) => i.group === g) }))
    .filter((g) => g.items.length > 0);

  const panel = ROLE_PANEL[role as Role] ?? ROLE_PANEL.USER;

  return (
    <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-4 flex-1">
        {groups.map(({ name, items }) => (
          <div key={name} className="mb-6">
            {GROUP_LABELS[name] && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                {GROUP_LABELS[name]}
              </h3>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                // Match exact path for /dashboard, prefix match for everything else
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground hover:border-l-4 hover:border-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-primary" : "group-hover:text-foreground"
                      )}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-all duration-200",
                      isActive
                        ? "text-primary translate-x-1 opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Role info panel */}
      <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {panel.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {panel.description}
        </p>
      </div>
    </aside>
  );
}