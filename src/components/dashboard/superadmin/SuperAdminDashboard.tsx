// src/components/dashboard/superadmin/SuperAdminDashboard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BookOpen, Check, Download, FileText,
  Mail, MessageSquare, RefreshCw,
  Shield, TrendingUp, UserCheck,
  UserPlus, Users, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Analytics {
  users:    { total: number; active: number; inactive: number; admins: number; newThisMonth: number };
  content:  { total: number; published: number; pending: number; draft: number };
  stories:  { total: number; pending: number; published: number; rejected: number };
  contacts: { total: number; unresolved: number; resolved: number; newThisMonth: number };
}

interface RecentActivity {
  newUsers:       { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }[];
  recentContent:  { id: string; title: string; contentType: string; status: string; authorName: string | null; updatedAt: string }[];
  recentStories:  { id: string; name: string; email: string; title: string; status: string; submittedAt: string }[];
  recentContacts: { id: string; name: string; email: string; subject: string | null; isResolved: boolean; submittedAt: string }[];
}

// ─── Constants (outside component) ────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  PENDING:   "bg-amber-100 text-amber-800",
  REJECTED:  "bg-red-100 text-red-800",
  DRAFT:     "bg-secondary text-muted-foreground",
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  ADMIN:       "bg-blue-100 text-blue-800",
  USER:        "bg-secondary text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
      STATUS_STYLES[status] ?? "bg-secondary text-muted-foreground"
    )}>
      {status.toLowerCase()}
    </span>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, iconColor = "text-muted-foreground",
}: {
  title: string; value: number; sub: string;
  icon: React.ElementType; iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [analytics,      setAnalytics]      = useState<Analytics | null>(null);
  const [activity,       setActivity]       = useState<RecentActivity | null>(null);
  const [loadingStats,   setLoadingStats]   = useState(true);
  const [loadingActivity,setLoadingActivity]= useState(true);
  const [statsError,     setStatsError]     = useState(false);
  const [exporting,      setExporting]      = useState<"users" | "content" | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);

  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => { setToast(null); toastRef.current = null; }, 4000);
  }, []);

  // ── Fetch analytics ───────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(false);
    try {
      const res  = await fetch("/api/superadmin/analytics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalytics(data.data);
    } catch {
      setStatsError(true);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Fetch recent activity ─────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res  = await fetch("/api/superadmin/recent-activity");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActivity(data.data);
    } catch {
      // activity failing is non-critical — don't block the whole page
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchActivity();
  }, [fetchAnalytics, fetchActivity]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExport = async (entity: "users" | "content") => {
    setExporting(entity);
    try {
      const res = await fetch("/api/superadmin/export", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ entity }),
      });
      if (!res.ok) throw new Error("Export failed");

      const blob     = await res.blob();
      const url      = window.URL.createObjectURL(blob);
      const a        = document.createElement("a");
      const today    = new Date().toISOString().split("T")[0];
      a.href         = url;
      a.download     = `${entity}_${today}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast(`${entity === "users" ? "Users" : "Content"} exported successfully`);
    } catch {
      showToast("Export failed — please try again", false);
    } finally {
      setExporting(null);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (statsError || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">Failed to load analytics</p>
        <Button variant="outline" onClick={fetchAnalytics}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.ok ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide overview and management
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={fetchAnalytics}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport("users")}
            disabled={exporting === "users"}
            className="gap-1.5"
          >
            {exporting === "users"
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Export Users
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => handleExport("content")}
            disabled={exporting === "content"}
            className="gap-1.5"
          >
            {exporting === "content"
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Export Content
          </Button>
        </div>
      </div>

      {/* ── Stats grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={analytics.users.total}
          sub={`${analytics.users.active} active · ${analytics.users.admins} admins`}
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard
          title="New Users (30d)"
          value={analytics.users.newThisMonth}
          sub={`${analytics.users.inactive} inactive accounts`}
          icon={UserPlus}
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Content"
          value={analytics.content.total}
          sub={`${analytics.content.published} published · ${analytics.content.pending} pending`}
          icon={BookOpen}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Pending Review"
          value={analytics.content.pending + analytics.stories.pending}
          sub={`${analytics.content.pending} content · ${analytics.stories.pending} stories`}
          icon={FileText}
          iconColor="text-amber-500"
        />
        <StatCard
          title="Story Submissions"
          value={analytics.stories.total}
          sub={`${analytics.stories.published} published · ${analytics.stories.rejected} rejected`}
          icon={TrendingUp}
          iconColor="text-pink-500"
        />
        <StatCard
          title="Contact Messages"
          value={analytics.contacts.total}
          sub={`${analytics.contacts.unresolved} unresolved · ${analytics.contacts.newThisMonth} this month`}
          icon={Mail}
          iconColor="text-red-500"
        />
        <StatCard
          title="Active Users"
          value={analytics.users.active}
          sub={`${analytics.users.inactive} inactive`}
          icon={UserCheck}
          iconColor="text-teal-500"
        />
        <StatCard
          title="Draft Content"
          value={analytics.content.draft}
          sub={`${analytics.content.published} live on site`}
          icon={Shield}
          iconColor="text-muted-foreground"
        />
      </div>

      {/* ── Quick links ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: "/dashboard/superadmin/users",   label: "Users",           icon: Users,          color: "text-blue-500"   },
              { href: "/dashboard/superadmin/admins",  label: "Admins",          icon: Shield,         color: "text-purple-500" },
              { href: "/dashboard/superadmin/analytics",label: "Analytics",      icon: TrendingUp,     color: "text-green-500"  },
              { href: "/dashboard/admin/content",      label: "Content",         icon: BookOpen,       color: "text-amber-500"  },
              { href: "/dashboard/admin/story-submissions", label: "Stories",    icon: FileText,       color: "text-pink-500"   },
              { href: "/dashboard/admin/contact-submissions",label: "Messages",  icon: MessageSquare,  color: "text-red-500"    },
              { href: "/dashboard/admin/categories",   label: "Categories",      icon: Mail,           color: "text-teal-500"   },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/50 hover:border-primary/30 transition-all cursor-pointer h-24">
                  <Icon className={cn("h-6 w-6", color)} />
                  <span className="text-xs font-medium text-foreground text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      {loadingActivity ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* New users */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">New Users</CardTitle>
              <Link href="/dashboard/superadmin/users">
                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.newUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              ) : activity.newUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      ROLE_STYLES[u.role] ?? ROLE_STYLES.USER
                    )}>
                      {u.role.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.createdAt), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent content */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Content</CardTitle>
              <Link href="/dashboard/admin/content">
                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.recentContent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No content yet</p>
              ) : activity.recentContent.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.contentType.replace("_", " ")} · {c.authorName ?? "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(c.updatedAt), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending story submissions */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Recent Story Submissions
                {analytics.stories.pending > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                    {analytics.stories.pending} pending
                  </span>
                )}
              </CardTitle>
              <Link href="/dashboard/admin/story-submissions">
                <Button variant="ghost" size="sm" className="text-xs h-7">Review</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.recentStories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
              ) : activity.recentStories.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">by {s.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={s.status} />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.submittedAt), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Unresolved contact messages */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Unresolved Messages
                {analytics.contacts.unresolved > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                    {analytics.contacts.unresolved}
                  </span>
                )}
              </CardTitle>
              <Link href="/dashboard/admin/contact-submissions">
                <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.recentContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All messages resolved 🎉</p>
              ) : activity.recentContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.subject ?? "No subject"} · {c.email}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(c.submittedAt), "MMM d")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}