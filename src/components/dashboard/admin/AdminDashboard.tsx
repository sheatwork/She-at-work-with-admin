// src/components/dashboard/admin/AdminDashboard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, BookOpen,
  CheckCircle,
  Clock, FileCheck, FileText, FolderTree, Mail,
  MessageSquare, PlusCircle,
  TrendingUp,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  stats: {
    content:  { published: number; pending: number; draft: number; rejected: number; total: number };
    stories:  { pending: number; approved: number; rejected: number; total: number };
    contacts: { total: number; unresolved: number };
    users:    { total: number; users: number; admins: number; superAdmins: number };
  };
  recent: {
    content: {
      id: string; title: string; slug: string; contentType: string;
      status: string; authorName: string | null; categoryName: string | null;
      createdAt: string; publishedAt: string | null;
    }[];
    stories: {
      id: string; title: string; name: string;
      businessName: string | null; status: string; submittedAt: string;
    }[];
    contacts: {
      id: string; name: string; email: string;
      subject: string | null; isResolved: boolean; submittedAt: string;
    }[];
  };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return formatDate(iso);
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700 border-green-200" },
  PENDING:   { label: "Pending",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  DRAFT:     { label: "Draft",     color: "bg-secondary text-muted-foreground border-border" },
  REJECTED:  { label: "Rejected",  color: "bg-red-100 text-red-700 border-red-200" },
  APPROVED:  { label: "Approved",  color: "bg-green-100 text-green-700 border-green-200" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { label: status, color: "bg-secondary text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${s.color}`}>
      {s.label}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, iconColor, onClick, urgent,
}: {
  title: string; value: number; sub: string;
  icon: React.ElementType; iconColor: string;
  onClick?: () => void; urgent?: boolean;
}) {
  return (
    <Card
      onClick={onClick}
      className={[
        "relative overflow-hidden transition-all duration-200",
        onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "",
        urgent && value > 0 ? "ring-2 ring-amber-400/60" : "",
      ].join(" ")}
    >
      {urgent && value > 0 && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${iconColor}/10`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Quick action button ────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon, label, href, badge,
}: {
  icon: React.ElementType; label: string; href: string; badge?: number;
}) {
  return (
    <Link href={href}>
      <div className="relative flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-border bg-secondary/20 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 cursor-pointer group px-3">
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors">
          {label}
        </span>
      </div>
    </Link>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      setError(false);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchStats, 120_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-foreground font-medium">Failed to load dashboard</p>
          <Button onClick={fetchStats} variant="outline">Try again</Button>
        </div>
      </div>
    );
  }

  const { stats, recent } = data;

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated {formatRelative(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <TrendingUp className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => router.push("/dashboard/admin/content/new")} className="gap-2">
            <PlusCircle className="h-4 w-4" /> New Content
          </Button>
        </div>
      </div>

      {/* ── Content stats ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Content</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Published"    value={stats.content.published} sub="Live on platform"
            icon={CheckCircle} iconColor="text-green-500"
            onClick={() => router.push("/dashboard/admin/content?status=PUBLISHED")} />
          <StatCard title="Pending"      value={stats.content.pending}   sub="Awaiting review"
            icon={Clock}        iconColor="text-amber-500"
            onClick={() => router.push("/dashboard/admin/content?status=PENDING")} urgent />
          <StatCard title="Draft"        value={stats.content.draft}     sub="Work in progress"
            icon={FileText}     iconColor="text-blue-500"
            onClick={() => router.push("/dashboard/admin/content?status=DRAFT")} />
          <StatCard title="Total Content" value={stats.content.total}    sub="All content items"
            icon={BookOpen}     iconColor="text-primary"
            onClick={() => router.push("/dashboard/admin/content")} />
        </div>
      </div>

      {/* ── Submissions & Users stats ───────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Submissions & Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pending Stories"     value={stats.stories.pending}      sub="Awaiting review"
            icon={BookOpen}       iconColor="text-purple-500"
            onClick={() => router.push("/dashboard/admin/story-submissions?status=PENDING")} urgent />
          <StatCard title="Unresolved Contacts" value={stats.contacts.unresolved}  sub="Need a response"
            icon={MessageSquare}  iconColor="text-red-500"
            onClick={() => router.push("/dashboard/admin/contact-submissions?isResolved=false")} urgent />
          <StatCard title="Total Stories"       value={stats.stories.total}        sub="All time submissions"
            icon={FileCheck}      iconColor="text-indigo-500"
            onClick={() => router.push("/dashboard/admin/story-submissions")} />
          <StatCard title="Total Contacts"      value={stats.contacts.total}       sub="Messages received"
            icon={Mail}           iconColor="text-teal-500"
            onClick={() => router.push("/dashboard/admin/contact-submissions")} />
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction icon={PlusCircle}    label="New Content"        href="/dashboard/admin/content/new" />
          <QuickAction icon={FileCheck}     label="Review Content"     href="/dashboard/admin/content?status=PENDING"     badge={stats.content.pending} />
          <QuickAction icon={FolderTree}    label="Categories"         href="/dashboard/admin/categories" />
          <QuickAction icon={BookOpen}      label="Story Submissions"  href="/dashboard/admin/story-submissions"          badge={stats.stories.pending} />
          <QuickAction icon={Mail}          label="Contact Messages"   href="/dashboard/admin/contact-submissions"        badge={stats.contacts.unresolved} />
          <QuickAction icon={BarChart3}     label="Analytics"          href="/dashboard/superadmin/analytics" />
        </div>
      </div>

      {/* ── Recent activity tables ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Content */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Recent Content</CardTitle>
              <Link href="/dashboard/admin/content">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {recent.content.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No content yet</p>
              ) : recent.content.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{item.contentType}</span>
                      {item.categoryName && (
                        <span className="text-[10px] text-muted-foreground">· {item.categoryName}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{formatRelative(item.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Story Submissions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Story Submissions</CardTitle>
              <Link href="/dashboard/admin/story-submissions">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {recent.stories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
              ) : recent.stories.map((story) => (
                <div key={story.id} className="flex items-start justify-between gap-2 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{story.title || story.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">{story.name}</span>
                      {story.businessName && (
                        <span className="text-[10px] text-muted-foreground">· {story.businessName}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(story.submittedAt)}</p>
                  </div>
                  <StatusBadge status={story.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Unresolved Contacts */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Unresolved Contacts</CardTitle>
              <Link href="/dashboard/admin/contact-submissions">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">View all</Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              {recent.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">All contacts resolved 🎉</p>
              ) : recent.contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between gap-2 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{contact.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{contact.subject || contact.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(contact.submittedAt)}</p>
                  </div>
                  <Link href={`/dashboard/admin/contact-submissions`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2">
                      Resolve
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Content breakdown bar ───────────────────────────────────────────── */}
      {stats.content.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Content Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Published", value: stats.content.published, color: "bg-green-500",  total: stats.content.total },
                { label: "Pending",   value: stats.content.pending,   color: "bg-amber-500",  total: stats.content.total },
                { label: "Draft",     value: stats.content.draft,     color: "bg-blue-400",   total: stats.content.total },
                { label: "Rejected",  value: stats.content.rejected,  color: "bg-red-400",    total: stats.content.total },
              ].filter((r) => r.value > 0).map(({ label, value, color, total }) => {
                const pct = Math.round((value / total) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}