// src/components/dashboard/admin/AdminDashboard.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Archive,
  BarChart3, BookOpen, CheckCircle, Clock,
  Eye,
  FileCheck,
  FolderTree, Mail, MessageSquare, PlusCircle, TrendingUp,
  UserCheck,
  Users,
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
    month: "short", day: "numeric",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return formatDate(iso);
}

const STATUS_CONFIG = {
  PUBLISHED: { label: "Published", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  DRAFT: { label: "Draft", color: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  REJECTED: { label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
} as const;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || 
    { label: status, color: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}

// ─── Mini stat pill ────────────────────────────────────────────────────────────

function MiniStat({ label, value, icon: Icon, color }: { 
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-secondary/30 rounded-lg px-2 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs">
        <span className="font-medium text-foreground">{value}</span>
        <span className="text-muted-foreground ml-1">{label}</span>
      </span>
    </div>
  );
}

// ─── Stat card (compact) ───────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, iconColor, onClick, urgent, trend
}: {
  title: string; value: number; sub: string;
  icon: React.ElementType; iconColor: string;
  onClick?: () => void; urgent?: boolean; trend?: number;
}) {
  return (
    <Card
      onClick={onClick}
      className={`
        relative overflow-hidden transition-all duration-200 border
        ${onClick ? "cursor-pointer hover:shadow-sm hover:border-primary/20" : ""}
        ${urgent && value > 0 ? "ring-1 ring-amber-400/50 bg-amber-50/30" : ""}
      `}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${iconColor}/10`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {urgent && value > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              Action needed
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{value.toLocaleString()}</span>
            {trend !== undefined && (
              <span className={`text-[10px] font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground/80">{title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Quick action button (compact) ─────────────────────────────────────────────

function QuickAction({ icon: Icon, label, href, badge, isActive }: {
  icon: React.ElementType; label: string; href: string; badge?: number; isActive?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`
        relative flex flex-col items-center justify-center gap-1.5
        h-20 rounded-lg border transition-all duration-200 group
        ${isActive 
          ? 'border-primary/30 bg-primary/5' 
          : 'border-border bg-secondary/20 hover:border-primary/30 hover:bg-primary/5'
        }
      `}>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
        <span className={`text-[10px] font-medium text-center leading-tight px-1 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    const interval = setInterval(fetchStats, 120_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-3">
          <XCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium">Failed to load dashboard</p>
          <Button onClick={fetchStats} size="sm" variant="outline">Try again</Button>
        </div>
      </div>
    );
  }

  const { stats, recent } = data;
  const totalPending = stats.content.pending + stats.stories.pending + stats.contacts.unresolved;

  return (
    <div className="space-y-5">

      {/* ── Header (compact) ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 pb-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">Updated {formatRelative(lastRefresh.toISOString())}</span>
              {totalPending > 0 && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  {totalPending} pending
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="ghost" size="sm" onClick={fetchStats} className="h-8 px-2 gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => router.push("/dashboard/admin/content/new")} className="h-8 gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="text-xs">New</span>
          </Button>
        </div>
      </div>

      {/* ─── Main Stats Grid (4 columns) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Published Content" value={stats.content.published}
          sub={`${Math.round((stats.content.published/stats.content.total)*100)}% of total`}
          icon={CheckCircle} iconColor="text-emerald-600"
          onClick={() => router.push("/dashboard/admin/content?status=PUBLISHED")}
        />
        <StatCard
          title="Pending Review" value={stats.content.pending + stats.stories.pending}
          sub={`${stats.content.pending} content · ${stats.stories.pending} stories`}
          icon={Clock} iconColor="text-amber-600"
          onClick={() => router.push("/dashboard/admin/content?status=PENDING")}
          urgent={stats.content.pending > 0 || stats.stories.pending > 0}
        />
        <StatCard
          title="Unresolved" value={stats.contacts.unresolved}
          sub="Contact messages"
          icon={MessageSquare} iconColor="text-rose-600"
          onClick={() => router.push("/dashboard/admin/contact-submissions?isResolved=false")}
          urgent={stats.contacts.unresolved > 0}
        />
        <StatCard
          title="Total Items" value={stats.content.total + stats.stories.total}
          sub={`${stats.content.total} content · ${stats.stories.total} stories`}
          icon={Archive} iconColor="text-indigo-600"
          onClick={() => router.push("/dashboard/admin/content")}
        />
      </div>

      {/* ─── Quick Stats Row ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <MiniStat label="Stories" value={stats.stories.total} icon={BookOpen} color="text-purple-500" />
        <MiniStat label="Contacts" value={stats.contacts.total} icon={Mail} color="text-teal-500" />
        <MiniStat label="Users" value={stats.users.total} icon={Users} color="text-blue-500" />
        <MiniStat label="Admins" value={stats.users.admins + stats.users.superAdmins} icon={UserCheck} color="text-slate-500" />
      </div>

      {/* ─── Quick Actions Grid ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          <QuickAction icon={PlusCircle} label="New" href="/dashboard/admin/content/new" />
          <QuickAction 
            icon={FileCheck} 
            label="Review" 
            href="/dashboard/admin/content?status=PENDING" 
            badge={stats.content.pending}
            isActive={stats.content.pending > 0}
          />
          <QuickAction icon={FolderTree} label="Categories" href="/dashboard/admin/categories" />
          <QuickAction 
            icon={BookOpen} 
            label="Stories" 
            href="/dashboard/admin/story-submissions" 
            badge={stats.stories.pending}
            isActive={stats.stories.pending > 0}
          />
          <QuickAction 
            icon={Mail} 
            label="Messages" 
            href="/dashboard/admin/contact-submissions" 
            badge={stats.contacts.unresolved}
            isActive={stats.contacts.unresolved > 0}
          />
          <QuickAction icon={BarChart3} label="Analytics" href="/dashboard/superadmin/analytics" />
          <QuickAction icon={Eye} label="Preview" href="/" />
          <QuickAction icon={Users} label="Users" href="/dashboard/admin/users" />
        </div>
      </div>

      {/* ─── Content Status Bar ────────────────────────────────────────────── */}
      {stats.content.total > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold">Content Distribution</h3>
              <span className="text-[10px] text-muted-foreground">{stats.content.total} total</span>
            </div>
            <div className="h-2 flex rounded-full overflow-hidden bg-secondary">
              {stats.content.published > 0 && (
                <div className="bg-emerald-500 h-full" style={{ width: `${(stats.content.published / stats.content.total) * 100}%` }} />
              )}
              {stats.content.pending > 0 && (
                <div className="bg-amber-500 h-full" style={{ width: `${(stats.content.pending / stats.content.total) * 100}%` }} />
              )}
              {stats.content.draft > 0 && (
                <div className="bg-blue-400 h-full" style={{ width: `${(stats.content.draft / stats.content.total) * 100}%` }} />
              )}
              {stats.content.rejected > 0 && (
                <div className="bg-rose-400 h-full" style={{ width: `${(stats.content.rejected / stats.content.total) * 100}%` }} />
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {stats.content.published > 0 && (
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Published {stats.content.published}
                </span>
              )}
              {stats.content.pending > 0 && (
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending {stats.content.pending}
                </span>
              )}
              {stats.content.draft > 0 && (
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Draft {stats.content.draft}
                </span>
              )}
              {stats.content.rejected > 0 && (
                <span className="flex items-center gap-1 text-[9px]">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Rejected {stats.content.rejected}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ─── Recent Activity Grid (3 columns) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Content */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">Recent Content</CardTitle>
              <Link href="/dashboard/admin/content">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {recent.content.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No content yet</p>
            ) : recent.content.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start gap-2 p-2.5 hover:bg-secondary/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
                      {item.contentType}
                    </span>
                    <span className="text-[8px] text-muted-foreground">·</span>
                    <span className="text-[9px] text-muted-foreground">{formatRelative(item.createdAt)}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-1 mb-1">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span>{item.authorName || 'Unknown'}</span>
                      {item.categoryName && (
                        <>
                          <span>·</span>
                          <span>{item.categoryName}</span>
                        </>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Stories */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">Story Submissions</CardTitle>
              <Link href="/dashboard/admin/story-submissions">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {recent.stories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No submissions yet</p>
            ) : recent.stories.slice(0, 4).map((story) => (
              <div key={story.id} className="flex items-start gap-2 p-2.5 hover:bg-secondary/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] text-muted-foreground">{formatRelative(story.submittedAt)}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-1 mb-1">
                    {story.title || 'Untitled Story'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span>{story.name}</span>
                      {story.businessName && (
                        <>
                          <span>·</span>
                          <span className="line-clamp-1">{story.businessName}</span>
                        </>
                      )}
                    </div>
                    <StatusBadge status={story.status} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">Recent Contacts</CardTitle>
              <Link href="/dashboard/admin/contact-submissions">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {recent.contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">All clear ✨</p>
            ) : recent.contacts.slice(0, 4).map((contact) => (
              <div key={contact.id} className="flex items-start gap-2 p-2.5 hover:bg-secondary/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${contact.isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[9px] text-muted-foreground">{formatRelative(contact.submittedAt)}</span>
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-1 mb-1">{contact.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground line-clamp-1">
                      {contact.subject || contact.email}
                    </p>
                    {!contact.isResolved && (
                      <span className="text-[8px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}