/*eslint-disable @typescript-eslint/no-explicit-any */
// components/dashboard/admin/ContentModeration.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BookOpen, Check, Edit, Eye, EyeOff, FileText,
  RefreshCw, Search, Trash2, X, XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ContentDetail = ContentItem & {
  content:     string;
  categoryId:  string | null;
  externalUrl: string | null;
  tags: { id: string; name: string; slug: string }[];
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

// ─── Status config ─────────────────────────────────────────────────────────────
//
//  DRAFT     = "Unpublished" — saved but not live (also used when admin unpublishes)
//  PENDING   = awaiting admin review before going live
//  PUBLISHED = live and visible to the public
//  REJECTED  = admin declined; author should revise and resubmit
//
//  NOTE: There is no separate UNPUBLISHED enum value in the DB.
//  Unpublishing = setting status back to DRAFT. This is the standard pattern
//  and requires no migration.

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  DRAFT:     { label: "Unpublished", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  PENDING:   { label: "Pending",     badge: "bg-amber-100 text-amber-800 border-amber-200" },
  PUBLISHED: { label: "Published",   badge: "bg-green-100 text-green-800 border-green-200" },
  REJECTED:  { label: "Rejected",    badge: "bg-red-100   text-red-800   border-red-200"   },
};

const TYPE_STYLES: Record<string, string> = {
  BLOG:      "bg-purple-100 text-purple-800",
  NEWS:      "bg-blue-100   text-blue-800",
  ENTRECHAT: "bg-pink-100   text-pink-800",
  EVENT:     "bg-orange-100 text-orange-800",
  PRESS:     "bg-cyan-100   text-cyan-800",
};

// SUCCESS_STORY and RESOURCE have their own dedicated CRUD pages
const CONTENT_TYPES = [
  "BLOG","NEWS","ENTRECHAT","EVENT","PRESS",
] as const;

const STATUS_TABS = [
  { value: "",          label: "All"         },
  { value: "PENDING",   label: "Pending"     },
  { value: "PUBLISHED", label: "Published"   },
  { value: "DRAFT",     label: "Unpublished" },
  { value: "REJECTED",  label: "Rejected"    },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
      cfg?.badge ?? "bg-slate-100 text-slate-600 border-slate-200"
    )}>
      {cfg?.label ?? status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap",
      TYPE_STYLES[type] ?? "bg-slate-100 text-slate-600"
    )}>
      {type.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

function formatDate(iso: string | null) {
  return iso ? format(new Date(iso), "MMM d, yyyy") : "—";
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    )}>
      {type === "success" ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {msg}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ContentModeration() {
  const searchParams = useSearchParams();

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [search,       setSearch]       = useState("");
  const [debSearch,    setDebSearch]    = useState("");
  const [page,         setPage]         = useState(1);

  // Data
  const [items,      setItems]      = useState<ContentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page:1, limit:20, total:0, totalPages:0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Preview
  const [previewItem,    setPreviewItem]    = useState<ContentDetail | null>(null);
  const [previewOpen,    setPreviewOpen]    = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reject dialog
  const [rejectItem,   setRejectItem]   = useState<ContentItem | null>(null);
  const [rejectOpen,   setRejectOpen]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Delete dialog
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);

  const debRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [statusFilter, typeFilter]);

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) sp.set("status",      statusFilter);
      if (typeFilter)   sp.set("contentType", typeFilter);
      if (debSearch)    sp.set("search",      debSearch);
      const res = await fetch(`/api/admin/content?${sp}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.data ?? []);
      setPagination(data.pagination ?? { page:1, limit:20, total:0, totalPages:0 });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, debSearch]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // ── Open preview ────────────────────────────────────────────────────────────
  const openPreview = async (item: ContentItem) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewItem(null);
    try {
      const res = await fetch(`/api/admin/content/${item.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreviewItem(data.data);
    } catch {
      showToast("Failed to load preview", "error");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Patch helper ────────────────────────────────────────────────────────────
  const patch = async (id: string, body: object): Promise<boolean> => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch { return false; }
    finally { setProcessing(null); }
  };

  // ── Status actions ──────────────────────────────────────────────────────────
  const handlePublish = async (item: ContentItem) => {
    const ok = await patch(item.id, { status: "PUBLISHED" });
    if (ok) { showToast(`"${item.title}" published`); fetchContent(); }
    else showToast("Failed to publish", "error");
  };

  // Unpublish = set back to DRAFT (reuses existing DB enum value, no migration needed)
  const handleUnpublish = async (item: ContentItem) => {
    const ok = await patch(item.id, { status: "DRAFT" });
    if (ok) { showToast(`"${item.title}" unpublished`); fetchContent(); }
    else showToast("Failed to unpublish", "error");
  };

  const handleReject = async () => {
    if (!rejectItem || !rejectReason.trim()) return;
    const ok = await patch(rejectItem.id, { status: "REJECTED" });
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
    <div className="space-y-4">

      {toast && <Toast {...toast} />}

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage all articles, blogs, news and resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchContent} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Link href="/dashboard/admin/content/new">
            <Button size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" /> New Content
            </Button>
          </Link>
        </div>
      </div>
<div className="bg-white p-4 space-y-4 rounded-xl">
      {/* ── Status legend ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
        <span className="font-medium text-foreground mr-1">Status guide:</span>
        {Object.entries(STATUS_CONFIG).map(([key, { label, badge }]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("inline-flex px-2 py-0.5 rounded-full border text-xs font-medium", badge)}>
              {label}
            </span>
            <span className="hidden sm:inline">
              {key === "DRAFT"     && "— saved, not live"}
              {key === "PENDING"   && "— awaiting review"}
              {key === "PUBLISHED" && "— live to public"}
              {key === "REJECTED"  && "— declined, needs revision"}
            </span>
          </span>
        ))}
      </div>

      {/* ── Compact filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title or author…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <Select value={typeFilter || "ALL"}
          onValueChange={(v) => setTypeFilter(v === "ALL" ? "" : v)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {CONTENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t.toLowerCase().replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="hidden sm:flex items-center text-xs text-muted-foreground whitespace-nowrap px-1">
          {pagination.total} item{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Status tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap border-b border-border pb-3">
        {STATUS_TABS.map((t) => (
          <button key={t.value}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              statusFilter === t.value
                ? "bg-primary text-white border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <XCircle className="h-9 w-9 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load content</p>
          <Button variant="outline" size="sm" onClick={fetchContent}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <BookOpen className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No content found</p>
          <p className="text-xs text-muted-foreground">
            {statusFilter === "PENDING"
              ? "No pending content awaiting review"
              : "Try a different filter or create new content"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Content</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden lg:table-cell">Author</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">

                  {/* Content */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail */}
                      {item.featuredImage ? (
                        <div className="relative h-9 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                          <Image src={item.featuredImage} alt="" fill
                            className="object-cover" sizes="48px" />
                        </div>
                      ) : (
                        <div className="h-9 w-12 flex-shrink-0 rounded-md bg-muted/60 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm line-clamp-1 leading-tight">
                          {item.title}
                        </p>
                        {item.categoryName && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.categoryName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <TypeBadge type={item.contentType} />
                  </td>

                  {/* Status — inline dropdown for instant status change */}
                  <td className="px-4 py-3">
                    <Select
                      value={item.status}
                      disabled={processing === item.id}
                      onValueChange={async (newStatus) => {
                        if (newStatus === item.status) return;
                        const ok = await patch(item.id, { status: newStatus });
                        if (ok) { showToast(`Status → ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`); fetchContent(); }
                        else showToast("Status change failed", "error");
                      }}
                    >
                      <SelectTrigger className={cn(
                        "h-7 w-[120px] text-xs border font-medium",
                        STATUS_CONFIG[item.status]?.badge
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Unpublished</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Author */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {item.authorName ?? item.creatorName ?? "—"}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(item.publishedAt ?? item.createdAt)}
                    </span>
                  </td>

                  {/* Actions — icon buttons with tooltips */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">

                      {/* Preview */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openPreview(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>

                      {/* Edit */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/dashboard/admin/content/${item.id}/edit`}>
                            <Button variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>

                      {/* Publish / Unpublish */}
                      {item.status !== "PUBLISHED" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                              onClick={() => handlePublish(item)}
                              disabled={processing === item.id}>
                              {processing === item.id
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <Check className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Publish</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => handleUnpublish(item)}
                              disabled={processing === item.id}>
                              {processing === item.id
                                ? <RefreshCw className="h-4 w-4 animate-spin" />
                                : <EyeOff className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unpublish</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Reject (pending only) */}
                      {item.status === "PENDING" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={() => { setRejectItem(item); setRejectOpen(true); }}
                              disabled={processing === item.id}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reject</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Delete */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDeleteItem(item); setDeleteOpen(true); }}
                            disabled={processing === item.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} items
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
</div>
      {/* ════════════ DIALOGS ════════════════════════════════════════════ */}

      {/* ── Preview ──────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Preview</DialogTitle>
            <DialogDescription>Read-only preview before taking action</DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewItem ? (
            <div className="space-y-4">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={previewItem.status} />
                <TypeBadge type={previewItem.contentType} />
                {previewItem.categoryName && (
                  <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                    {previewItem.categoryName}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(previewItem.createdAt), "PPP")}
                </span>
              </div>

              {/* Image */}
              {previewItem.featuredImage && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <Image src={previewItem.featuredImage} alt={previewItem.title}
                    fill className="object-cover" sizes="720px" />
                </div>
              )}

              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-foreground">{previewItem.title}</h2>
                {previewItem.summary && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{previewItem.summary}</p>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-4 text-sm border-t border-b border-border py-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Author</span>
                  <span className="font-medium">{previewItem.authorName ?? previewItem.creatorName ?? "—"}</span>
                </div>
                {previewItem.readingTime && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Reading time</span>
                    <span className="font-medium">{previewItem.readingTime} min</span>
                  </div>
                )}
                {previewItem.publishedAt && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Published</span>
                    <span className="font-medium">{formatDate(previewItem.publishedAt)}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {previewItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {previewItem.tags.map((t) => (
                    <span key={t.id}
                      className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs">
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="border border-border rounded-xl p-4 bg-muted/10">
                <div className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: previewItem.content }} />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {previewItem && (
              <Link href={`/dashboard/admin/content/${previewItem.id}/edit`}>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              </Link>
            )}
            {previewItem?.status !== "PUBLISHED" && (
              <Button className="bg-green-600 hover:bg-green-700"
                onClick={() => { if (previewItem) { handlePublish(previewItem); setPreviewOpen(false); } }}
                disabled={processing === previewItem?.id}>
                <Check className="h-4 w-4 mr-2" /> Publish
              </Button>
            )}
            {previewItem?.status === "PUBLISHED" && (
              <Button variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => { if (previewItem) { handleUnpublish(previewItem); setPreviewOpen(false); } }}>
                <EyeOff className="h-4 w-4 mr-2" /> Unpublish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject ───────────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Content</DialogTitle>
            <DialogDescription>Provide feedback for the author</DialogDescription>
          </DialogHeader>

          {rejectItem && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border">
              <p className="font-medium text-sm line-clamp-1">{rejectItem.title}</p>
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

      {/* ── Delete ───────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>This cannot be undone. The content will be permanently removed.</DialogDescription>
          </DialogHeader>

          {deleteItem && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="font-medium text-sm text-red-900">{deleteItem.title}</p>
              <p className="text-xs text-red-700 mt-0.5">
                {deleteItem.contentType.toLowerCase().replace(/_/g, " ")} ·{" "}
                {STATUS_CONFIG[deleteItem.status]?.label ?? deleteItem.status}
              </p>
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
    </TooltipProvider>
  );
}

