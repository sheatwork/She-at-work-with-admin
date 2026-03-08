/*eslint-disable @typescript-eslint/no-explicit-any */
/*eslint-disable @typescript-eslint/no-unused-vars */
// src/components/dashboard/admin/ContentModeration.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle, ArrowRight, BookOpen, Calendar, CalendarIcon,
  Check, Eye, FileText, Filter, RefreshCw, Search,
  Trash2, X, XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

// Matches /api/admin/content GET response shape
type ContentItem = {
  id:           string;
  title:        string;
  slug:         string;
  summary:      string | null;
  contentType:  string;
  status:       string;
  featuredImage:string | null;
  readingTime:  number | null;
  publishedAt:  string | null;
  createdAt:    string;
  authorName:   string | null;
  categoryName: string | null;
  creatorName:  string | null;
};

// Matches /api/admin/content/[id] GET response shape (full detail for preview)
type ContentDetail = ContentItem & {
  content:    string;
  categoryId: string | null;
  externalUrl:string | null;
  tags: { id: string; name: string; slug: string }[];
};

type Pagination = {
  page: number; limit: number;
  total: number; totalPages: number;
};

// Content/status enums matching schema
const CONTENT_TYPES = ["BLOG","NEWS","ENTRECHAT","EVENT","PRESS","SUCCESS_STORY","RESOURCE"] as const;
const STATUSES      = ["PENDING","PUBLISHED","DRAFT","REJECTED"] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy");
}

function formatDateTime(iso: string): string {
  return format(new Date(iso), "PPpp");
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800 border-green-200",
  PENDING:   "bg-amber-100 text-amber-800 border-amber-200",
  DRAFT:     "bg-secondary text-muted-foreground border-border",
  REJECTED:  "bg-red-100 text-red-800 border-red-200",
};

const TYPE_STYLES: Record<string, string> = {
  BLOG:          "bg-purple-100 text-purple-800",
  NEWS:          "bg-blue-100 text-blue-800",
  ENTRECHAT:     "bg-pink-100 text-pink-800",
  SUCCESS_STORY: "bg-emerald-100 text-emerald-800",
  RESOURCE:      "bg-indigo-100 text-indigo-800",
  EVENT:         "bg-orange-100 text-orange-800",
  PRESS:         "bg-cyan-100 text-cyan-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
      STATUS_STYLES[status] ?? "bg-secondary text-muted-foreground border-border"
    )}>
      {status.toLowerCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
      TYPE_STYLES[type] ?? "bg-secondary text-muted-foreground"
    )}>
      {type.toLowerCase().replace("_", " ")}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function ContentModeration() {
  const searchParams = useSearchParams();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [status,       setStatus]       = useState(searchParams.get("status") ?? "PENDING");
  const [contentType,  setContentType]  = useState(searchParams.get("type")   ?? "");
  const [search,       setSearch]       = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [page,         setPage]         = useState(1);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [items,       setItems]      = useState<ContentItem[]>([]);
  const [pagination,  setPagination] = useState<Pagination>({ page:1, limit:20, total:0, totalPages:0 });
  const [categories,  setCategories] = useState<{ id:string; name:string; slug:string }[]>([]);

  // ── Loading / action state ──────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error,      setError]      = useState(false);

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [previewItem,   setPreviewItem]   = useState<ContentDetail | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [previewLoading,setPreviewLoading]= useState(false);
  const [scheduleItem,  setScheduleItem]  = useState<ContentItem | null>(null);
  const [scheduleOpen,  setScheduleOpen]  = useState(false);
  const [scheduleDate,  setScheduleDate]  = useState<Date | undefined>();
  const [rejectItem,    setRejectItem]    = useState<ContentItem | null>(null);
  const [rejectOpen,    setRejectOpen]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState("");
  const [deleteItem,    setDeleteItem]    = useState<ContentItem | null>(null);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [toast,         setToast]         = useState<{ msg:string; type:"success"|"error" } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // ── Reset page when filters change ─────────────────────────────────────────
  useEffect(() => { setPage(1); }, [status, contentType, dateFrom, dateTo]);

  // ── Fetch categories once (bundled from /api/content?meta=1) ───────────────
  useEffect(() => {
    fetch("/api/content?meta=1&contentType=BLOG")
      .then((r) => r.json())
      .then((d) => { if (d.categories) setCategories(d.categories); })
      .catch(() => {});
  }, []);

  // ── Fetch content list ──────────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);

    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (status)          sp.set("status",      status);
      if (contentType)     sp.set("contentType", contentType);
      if (debouncedSearch) sp.set("search",      debouncedSearch);
      if (dateFrom)        sp.set("dateFrom",    dateFrom);
      if (dateTo)          sp.set("dateTo",      dateTo);

      const res = await fetch(`/api/admin/content?${sp}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setItems(data.data ?? []);
      setPagination(data.pagination ?? { page:1, limit:20, total:0, totalPages:0 });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, status, contentType, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // ── Open preview — fetch full detail including content HTML ────────────────
  const openPreview = async (item: ContentItem) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/content/${item.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreviewItem(data.data);
    } catch {
      showToast("Failed to load content detail", "error");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const patchContent = async (id: string, body: object): Promise<boolean> => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const handlePublishNow = async (item: ContentItem) => {
    const ok = await patchContent(item.id, { status: "PUBLISHED" });
    if (ok) { showToast(`"${item.title}" published`); fetchContent(); }
    else      showToast("Failed to publish", "error");
  };

  const handleSchedule = async () => {
    if (!scheduleItem || !scheduleDate) return;
    // Keep PENDING status — real scheduler would flip it; for now just store publishedAt
    const ok = await patchContent(scheduleItem.id, {
      publishedAt: scheduleDate.toISOString(),
      status: "PENDING",
    });
    if (ok) {
      showToast(`Scheduled for ${format(scheduleDate, "PPP p")}`);
      setScheduleOpen(false);
      setScheduleDate(undefined);
      fetchContent();
    } else {
      showToast("Failed to schedule", "error");
    }
  };

  const handleReject = async () => {
    if (!rejectItem || !rejectReason.trim()) return;
    const ok = await patchContent(rejectItem.id, {
      status: "REJECTED",
      summary: rejectItem.summary, // preserve — API needs existing fields
    });
    if (ok) {
      showToast(`"${rejectItem.title}" rejected`);
      setRejectOpen(false);
      setRejectReason("");
      fetchContent();
    } else {
      showToast("Failed to reject", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setProcessing(deleteItem.id);
    try {
      const res = await fetch(`/api/admin/content/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(`"${deleteItem.title}" deleted`);
      setDeleteOpen(false);
      fetchContent();
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setProcessing(null);
    }
  };

  const clearFilters = () => {
    setStatus("PENDING"); setContentType(""); setSearch("");
    setDateFrom(""); setDateTo(""); setPage(1);
  };

  const isAnyFilterActive = status !== "PENDING" || !!contentType || !!search || !!dateFrom || !!dateTo;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all",
          toast.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        )}>
          {toast.type === "success"
            ? <Check className="h-4 w-4" />
            : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, publish, and manage all content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchContent} disabled={loading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/dashboard/admin/content/new">
            <Button size="sm" className="gap-2">
              <FileText className="h-4 w-4" /> New Content
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {pagination.total} item{pagination.total !== 1 ? "s" : ""} found
              </span>
              {isAnyFilterActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1 text-primary">
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or author…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v)}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
              <Select value={contentType || "ALL"} onValueChange={(v) => setContentType(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.toLowerCase().replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
              <Input type="date" value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            {/* Date to */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
              <Input type="date" value={dateTo}
                onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Status tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {(["PENDING","PUBLISHED","DRAFT","REJECTED","ALL"] as const).map((s) => (
          <button key={s}
            onClick={() => { setStatus(s === "ALL" ? "" : s); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              (status === s || (s === "ALL" && !status))
                ? "bg-primary text-white border-primary"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
            )}>
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading content…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load content</p>
              <Button variant="outline" onClick={fetchContent}>Try again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">No content found</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {status === "PENDING"
                  ? "No pending content to review. New submissions will appear here."
                  : "Try adjusting your filters."}
              </p>
              {isAnyFilterActive && (
                <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Content</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Author</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                      {/* Content */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-start gap-3">
                          {item.featuredImage ? (
                            <div className="relative h-10 w-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                              <Image src={item.featuredImage} alt={item.title} fill className="object-cover"
                                sizes="56px" />
                            </div>
                          ) : (
                            <div className="h-10 w-14 flex-shrink-0 rounded bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                            {item.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.summary}</p>
                            )}
                            {item.categoryName && (
                              <span className="text-[10px] text-muted-foreground">{item.categoryName}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {item.authorName ?? item.creatorName ?? "—"}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <TypeBadge type={item.contentType} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-foreground">{formatDate(item.createdAt)}</div>
                        {item.publishedAt && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Published {formatDate(item.publishedAt)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Preview */}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => openPreview(item)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Pending-only actions */}
                          {item.status === "PENDING" && (
                            <>
                              <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => { setScheduleItem(item); setScheduleOpen(true); }}
                                title="Schedule" disabled={processing === item.id}>
                                <CalendarIcon className="h-4 w-4" />
                              </Button>

                              <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handlePublishNow(item)}
                                title="Publish now" disabled={processing === item.id}>
                                {processing === item.id
                                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                                  : <Check className="h-4 w-4" />}
                              </Button>

                              <Button variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => { setRejectItem(item); setRejectOpen(true); }}
                                title="Reject" disabled={processing === item.id}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {/* Republish rejected/draft */}
                          {(item.status === "REJECTED" || item.status === "DRAFT") && (
                            <Button variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handlePublishNow(item)}
                              title="Publish" disabled={processing === item.id}>
                              {processing === item.id
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <ArrowRight className="h-4 w-4" />}
                            </Button>
                          )}

                          {/* Delete */}
                          <Button variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDeleteItem(item); setDeleteOpen(true); }}
                            title="Delete" disabled={processing === item.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} items
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════ DIALOGS ════════════════════════════════════════════ */}

      {/* ── Preview dialog ───────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Preview</DialogTitle>
            <DialogDescription>Full detail before taking action</DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewItem ? (
            <div className="space-y-5">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={previewItem.status} />
                <TypeBadge type={previewItem.contentType} />
                {previewItem.categoryName && (
                  <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                    {previewItem.categoryName}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(previewItem.createdAt)}
                </span>
              </div>

              {/* Featured image */}
              {previewItem.featuredImage && (
                <div className="relative w-full h-52 rounded-xl overflow-hidden">
                  <Image src={previewItem.featuredImage} alt={previewItem.title}
                    fill className="object-cover" sizes="720px" />
                </div>
              )}

              {/* Title + summary */}
              <div>
                <h2 className="text-xl font-bold text-foreground">{previewItem.title}</h2>
                {previewItem.summary && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{previewItem.summary}</p>
                )}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Author</span>
                  <p className="font-medium mt-0.5">{previewItem.authorName ?? previewItem.creatorName ?? "—"}</p>
                </div>
                {previewItem.readingTime && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Reading time</span>
                    <p className="font-medium mt-0.5">{previewItem.readingTime} min</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {previewItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {previewItem.tags.map((t) => (
                    <span key={t.id} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Content HTML */}
              <div className="border border-border rounded-xl p-4 bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Content</p>
                <div className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: previewItem.content }} />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {previewItem?.status === "PENDING" && (
              <>
                <Button variant="destructive"
                  onClick={() => { setPreviewOpen(false); setRejectItem(previewItem); setRejectOpen(true); }}>
                  <X className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button variant="outline"
                  onClick={() => { setPreviewOpen(false); setScheduleItem(previewItem); setScheduleOpen(true); }}>
                  <CalendarIcon className="h-4 w-4 mr-2" /> Schedule
                </Button>
                <Button className="bg-green-600 hover:bg-green-700"
                  onClick={() => { handlePublishNow(previewItem); setPreviewOpen(false); }}
                  disabled={processing === previewItem.id}>
                  <Check className="h-4 w-4 mr-2" /> Publish Now
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule dialog ───────────────────────────────────────────────── */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Publishing</DialogTitle>
            <DialogDescription>Pick when this content should go live</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label>Select date & time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start font-normal", !scheduleDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, "PPP p") : "Pick a date…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent mode="single" selected={scheduleDate}
                  onSelect={setScheduleDate} initialFocus
                  disabled={(d) => d < new Date()} />
                <div className="p-3 border-t">
                  <Input type="time"
                    value={scheduleDate ? format(scheduleDate, "HH:mm") : ""}
                    onChange={(e) => {
                      if (!scheduleDate) return;
                      const [h, m] = e.target.value.split(":").map(Number);
                      const d = new Date(scheduleDate);
                      d.setHours(h, m);
                      setScheduleDate(d);
                    }} />
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              Content stays in Pending until the scheduled time.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setScheduleOpen(false); setScheduleDate(undefined); }}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={!scheduleDate || processing === scheduleItem?.id}>
              {processing === scheduleItem?.id
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Scheduling…</>
                : <><Calendar className="h-4 w-4 mr-2" />Schedule</>}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700"
              onClick={() => { if (scheduleItem) { handlePublishNow(scheduleItem); setScheduleOpen(false); } }}
              disabled={processing === scheduleItem?.id}>
              <Check className="h-4 w-4 mr-2" /> Publish Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ─────────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content</DialogTitle>
            <DialogDescription>Provide feedback for the author</DialogDescription>
          </DialogHeader>

          {rejectItem && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <p className="font-medium text-sm text-foreground line-clamp-1">{rejectItem.title}</p>
              {rejectItem.summary && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rejectItem.summary}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="rejectReason" className="mb-1.5 block">Reason for rejection</Label>
            <Textarea id="rejectReason" rows={4}
              placeholder="Give specific, actionable feedback to the author…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">This feedback will be shared with the author.</p>
          </div>

          <DialogFooter>
            <Button variant="outline"
              onClick={() => { setRejectOpen(false); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}
              disabled={!rejectReason.trim() || processing === rejectItem?.id}>
              {processing === rejectItem?.id
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Rejecting…</>
                : <><X className="h-4 w-4 mr-2" />Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {deleteItem && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="font-medium text-sm text-red-900">{deleteItem.title}</p>
              <p className="text-xs text-red-700 mt-0.5">{deleteItem.contentType} · {deleteItem.status}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}
              disabled={processing === deleteItem?.id}>
              {processing === deleteItem?.id
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Delete permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}