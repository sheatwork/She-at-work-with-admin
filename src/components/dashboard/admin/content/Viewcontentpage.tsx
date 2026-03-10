// src/components/dashboard/admin/content/ViewContentPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft, Check, Edit, ExternalLink, RefreshCw,
  Tag, Trash2, X, XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContentDetail = {
  id:           string;
  title:        string;
  slug:         string;
  summary:      string | null;
  content:      string;
  contentType:  string;
  status:       string;
  featuredImage:string | null;
  externalUrl:  string | null;
  readingTime:  number | null;
  publishedAt:  string | null;
  createdAt:    string;
  updatedAt:    string;
  authorName:   string | null;
  categoryId:   string | null;
  categoryName: string | null;
  createdBy:    string | null;
  creatorName:  string | null;
  tags:         { id: string; name: string; slug: string }[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  // Map DRAFT to show "Unpublished"
  const displayStatus = status === "DRAFT" ? "Unpublished" : status.toLowerCase();
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
      STATUS_STYLES[status] ?? "bg-secondary text-muted-foreground border-border"
    )}>
      {displayStatus}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize",
      TYPE_STYLES[type] ?? "bg-secondary text-muted-foreground"
    )}>
      {type.toLowerCase().replace("_", " ")}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}

interface ViewContentPageProps { id: string }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ViewContentPage({ id }: ViewContentPageProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [item,       setItem]       = useState<ContentDetail | null>(null);
  const [fetching,   setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchItem = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/content/${id}`);
      if (!res.ok) throw new Error("Content not found");
      const data = await res.json();
      setItem(data.data);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchItem(); }, [id]);

  // Show toast if redirected from edit
  useEffect(() => {
    if (searchParams.get("updated")) showToast("Content updated successfully");
  }, [searchParams]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const patchStatus = async (status: string) => {
    if (!item) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      
      // Show appropriate success message
      const statusMessages: Record<string, string> = {
        PUBLISHED: "Content published successfully",
        DRAFT: "Content moved to Unpublished",
        PENDING: "Content submitted for review",
        REJECTED: "Content rejected",
      };
      showToast(statusMessages[status] || `Status changed to ${status.toLowerCase()}`);
      
      fetchItem();
    } catch {
      showToast("Action failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/dashboard/admin/content?deleted=1");
    } catch {
      showToast("Failed to delete");
      setProcessing(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">{fetchError ?? "Content not found"}</p>
        <Link href="/dashboard/admin/content">
          <button className="text-sm text-primary underline">Back to Content</button>
        </Link>
      </div>
    );
  }

  // ── Public URL ─────────────────────────────────────────────────────────────
  const publicUrl = item.externalUrl
    ? item.externalUrl
    : `/${item.contentType.toLowerCase()}s/${item.slug}`;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-lg text-sm font-medium">
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/content">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </Link>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View public page */}
          <Link href={publicUrl} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Public Page
            </Button>
          </Link>

          {/* Edit */}
          <Link href={`/dashboard/admin/content/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>

          {/* Status actions */}
          {item.status === "PENDING" && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => patchStatus("PUBLISHED")} disabled={processing}>
              {processing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Publish
            </Button>
          )}
          {item.status === "PUBLISHED" && (
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => patchStatus("DRAFT")} disabled={processing}>
              Move to Unpublished
            </Button>
          )}
          {item.status === "PENDING" && (
            <Button size="sm" variant="outline"
              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => patchStatus("REJECTED")} disabled={processing}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          {/* Show "Move to Unpublished" for any non-published, non-draft states */}
          {item.status !== "PUBLISHED" && item.status !== "DRAFT" && item.status !== "PENDING" && (
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => patchStatus("DRAFT")} disabled={processing}>
              Move to Unpublished
            </Button>
          )}

          {/* Delete */}
          <Button size="sm" variant="ghost"
            className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)} disabled={processing}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Content area ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={item.status} />
              <TypeBadge type={item.contentType} />
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{item.title}</h1>
            {item.summary && (
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed border-l-4 border-primary/30 pl-4">
                {item.summary}
              </p>
            )}
          </div>

          {/* Featured image */}
          {item.featuredImage && (
            <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden border border-border">
              <Image src={item.featuredImage} alt={item.title} fill
                className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs">
                  <Tag className="h-3 w-3" /> {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Content HTML */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Publish info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetaRow label="Status"       value={<StatusBadge status={item.status} />} />
              <MetaRow label="Content Type" value={<TypeBadge type={item.contentType} />} />
              <MetaRow label="Category"     value={item.categoryName} />
              <MetaRow label="Author"       value={item.authorName ?? item.creatorName} />
              <MetaRow label="Reading Time" value={item.readingTime ? `${item.readingTime} min` : null} />
              {item.publishedAt && (
                <MetaRow label="Published"  value={format(new Date(item.publishedAt), "PPP")} />
              )}
              <MetaRow label="Created"      value={format(new Date(item.createdAt), "PPP")} />
              <MetaRow label="Last Updated" value={format(new Date(item.updatedAt), "PPP")} />
            </CardContent>
          </Card>

          {/* Slug */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Slug</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all text-muted-foreground">
                {item.slug}
              </code>
            </CardContent>
          </Card>

          {/* External link */}
          {item.externalUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">External URL</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={item.externalUrl} target="_blank"
                  className="text-xs text-primary underline break-all flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {item.externalUrl}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/dashboard/admin/content/${id}/edit`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Edit className="h-4 w-4" /> Edit Content
                </Button>
              </Link>
              
              {item.status !== "PUBLISHED" && (
                <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => patchStatus("PUBLISHED")} disabled={processing}>
                  <Check className="h-4 w-4" /> Publish Now
                </Button>
              )}
              
              {item.status === "PUBLISHED" && (
                <Button size="sm" variant="outline" className="w-full gap-2"
                  onClick={() => patchStatus("DRAFT")} disabled={processing}>
                  Move to Unpublished
                </Button>
              )}
              
              {item.status === "PENDING" && (
                <Button size="sm" variant="outline" className="w-full gap-2 text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => patchStatus("REJECTED")} disabled={processing}>
                  <X className="h-4 w-4" /> Reject
                </Button>
              )}
              
              <Button size="sm" variant="outline"
                className="w-full gap-2 text-red-600 hover:bg-red-50 border-red-200"
                onClick={() => setDeleteOpen(true)} disabled={processing}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>This cannot be undone. The content will be permanently removed.</DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="font-medium text-sm text-red-900">{item.title}</p>
            <p className="text-xs text-red-700 mt-0.5">{item.contentType} · {item.status === "DRAFT" ? "Unpublished" : item.status.toLowerCase()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deleting…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Delete permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}