// components/dashboard/admin/story-submissions/StorySubmissionDetail.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft, Building2, Calendar, Check, ExternalLink,
  FileText,
  Mail, Phone, RefreshCw, Send,
  Tag,
  User, X, XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PublishDialog, { PublishPayload } from "./PublishDialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SubmissionDetail = {
  id:                 string;
  name:               string;
  email:              string;
  phone:              string | null;
  title:              string;
  story:              string;
  businessName:       string | null;
  industry:           string | null;
  images:             string[] | null;
  status:             string;
  reviewNotes:        string | null;
  publishedContentId: string | null;
  submittedAt:        string;
  reviewedAt:         string | null;
  reviewerName:       string | null;
  publishedContent:   {
    id: string; title: string; slug: string;
    status: string; categoryName: string | null;
  } | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800 border-green-200",
  PENDING:   "bg-amber-100 text-amber-800 border-amber-200",
  REJECTED:  "bg-red-100 text-red-800 border-red-200",
  DRAFT:     "bg-secondary text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
      STATUS_STYLES[status] ?? "bg-secondary text-muted-foreground border-border"
    )}>
      {status.toLowerCase()}
    </span>
  );
}

function MetaRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

interface Props { id: string }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function StorySubmissionDetail({ id }: Props) {
  const [item,          setItem]          = useState<SubmissionDetail | null>(null);
  const [fetching,      setFetching]      = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [processing,    setProcessing]    = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  // Reject dialog
  const [rejectOpen,   setRejectOpen]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError,  setRejectError]  = useState<string | null>(null);

  // Publish dialog
  const [publishOpen,  setPublishOpen]  = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing,   setPublishing]   = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch detail ──────────────────────────────────────────────────────────

  const fetchDetail = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/story-submissions/${id}`);
      if (!res.ok) throw new Error("Submission not found");
      const data = await res.json();
      setItem(data.data);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectReason.trim() || !item) return;
    setProcessing(true);
    setRejectError(null);
    try {
      const res = await fetch(`/api/admin/story-submissions/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:      "REJECTED",
          reviewNotes: rejectReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRejectOpen(false);
      setRejectReason("");
      showToast("Submission rejected");
      fetchDetail();
    } catch (err: any) {
      setRejectError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePublish = async (payload: PublishPayload) => {
    if (!item) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/story-submissions/${id}/publish`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // We don't have a session hook here — pass a placeholder;
          // in production wire in useSession().data?.user?.id
          reviewedBy:   "admin",
          reviewNotes:  payload.reviewNotes || null,
          title:        payload.title,
          authorName:   payload.authorName  || null,
          summary:      payload.summary     || null,
          contentType:  payload.contentType,
          categoryId:   payload.categoryId  || null,
          featuredImage:payload.featuredImage || null,
          readingTime:  payload.readingTime ? Number(payload.readingTime) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to publish");
      setPublishOpen(false);
      showToast("Story published successfully as content!");
      fetchDetail();
    } catch (err: any) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading submission…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">{fetchError ?? "Not found"}</p>
        <Link href="/dashboard/admin/story-submissions">
          <button className="text-sm text-primary underline">Back to Submissions</button>
        </Link>
      </div>
    );
  }

  const isPending   = item.status === "PENDING";
  const isPublished = item.status === "PUBLISHED";
  const images      = Array.isArray(item.images) ? item.images : [];

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/dashboard/admin/story-submissions">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Submissions
          </button>
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPending && (
            <>
              <Button variant="outline" size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setRejectOpen(true)} disabled={processing}>
                <X className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700"
                onClick={() => setPublishOpen(true)} disabled={processing}>
                <Send className="h-3.5 w-3.5" /> Publish as Content
              </Button>
            </>
          )}
          {isPublished && item.publishedContent && (
            <Link href={`/dashboard/admin/content/${item.publishedContentId}/view`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> View Published Content
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Already published banner */}
      {isPublished && item.publishedContent && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">This story has been published</p>
            <p className="text-xs text-green-700 mt-0.5">
              Published as &ldquo;{item.publishedContent.title}&rdquo;
              {item.publishedContent.categoryName && ` in ${item.publishedContent.categoryName}`}
              {item.reviewedAt && ` on ${format(new Date(item.reviewedAt), "PPP")}`}
              {item.reviewerName && ` by ${item.reviewerName}`}
            </p>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {item.status === "REJECTED" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Submission rejected</p>
            {item.reviewNotes && (
              <p className="text-xs text-red-700 mt-0.5">Reason: {item.reviewNotes}</p>
            )}
            {item.reviewedAt && (
              <p className="text-xs text-red-600 mt-0.5">
                {format(new Date(item.reviewedAt), "PPP")}
                {item.reviewerName ? ` by ${item.reviewerName}` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Story content ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Title + status */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={item.status} />
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{item.title}</h1>
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div className={cn(
              "grid gap-3",
              images.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {images.slice(0, 4).map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-border h-48">
                  <Image src={src} alt={`Story image ${i+1}`} fill
                    className="object-cover" sizes="(max-width:1024px) 50vw, 33vw" />
                </div>
              ))}
            </div>
          )}

          {/* Story body */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Story
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {item.story}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Submitter info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Submitter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetaRow icon={User}     label="Name"  value={item.name} />
              <MetaRow icon={Mail}     label="Email" value={
                <a href={`mailto:${item.email}`}
                  className="text-primary hover:underline">{item.email}</a>
              } />
              {item.phone && (
                <MetaRow icon={Phone} label="Phone" value={
                  <a href={`tel:${item.phone}`}
                    className="text-primary hover:underline">{item.phone}</a>
                } />
              )}
            </CardContent>
          </Card>

          {/* Business info */}
          {(item.businessName || item.industry) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Business</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.businessName && (
                  <MetaRow icon={Building2} label="Business Name" value={item.businessName} />
                )}
                {item.industry && (
                  <MetaRow icon={Tag} label="Industry" value={item.industry} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetaRow icon={Calendar} label="Submitted"
                value={format(new Date(item.submittedAt), "PPP p")} />
              {item.reviewedAt && (
                <MetaRow icon={Calendar} label="Reviewed"
                  value={format(new Date(item.reviewedAt), "PPP")} />
              )}
              {item.reviewerName && (
                <MetaRow icon={User} label="Reviewed by" value={item.reviewerName} />
              )}
            </CardContent>
          </Card>

          {/* Review notes */}
          {item.reviewNotes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Review Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.reviewNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Published content link */}
          {isPublished && item.publishedContent && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Published Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium text-green-900 line-clamp-2">
                  {item.publishedContent.title}
                </p>
                {item.publishedContent.categoryName && (
                  <p className="text-xs text-green-700">{item.publishedContent.categoryName}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Link href={`/dashboard/admin/content/${item.publishedContentId}/view`}>
                    <Button size="sm" variant="outline"
                      className="gap-1 h-7 text-xs border-green-300 text-green-800 hover:bg-green-100">
                      <ExternalLink className="h-3 w-3" /> View in Admin
                    </Button>
                  </Link>
                  <Link href={`/blogs/${item.publishedContent.slug}`} target="_blank">
                    <Button size="sm" variant="outline"
                      className="gap-1 h-7 text-xs border-green-300 text-green-800 hover:bg-green-100">
                      <ExternalLink className="h-3 w-3" /> Public Page
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions for pending */}
          {isPending && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => setPublishOpen(true)} disabled={processing}>
                  <Send className="h-4 w-4" /> Publish as Content
                </Button>
                <Button variant="outline"
                  className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setRejectOpen(true)} disabled={processing}>
                  <X className="h-4 w-4" /> Reject Submission
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Reject Dialog ────────────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason — this helps the submitter improve their story.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">by {item.name}</p>
          </div>

          {rejectError && (
            <p className="text-sm text-red-600">{rejectError}</p>
          )}

          <div>
            <Label htmlFor="rejectReason" className="mb-1.5 block">Reason for rejection</Label>
            <Textarea id="rejectReason" rows={4}
              placeholder="Give specific feedback to help the submitter…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}
              disabled={!rejectReason.trim() || processing}>
              {processing
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Rejecting…</>
                : <><X className="h-4 w-4 mr-2" />Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Publish Dialog ───────────────────────────────────────────────── */}
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        submissionTitle={item.title}
        submitterName={item.name}
        onPublish={handlePublish}
        publishing={publishing}
        error={publishError}
      />
    </div>
  );
}