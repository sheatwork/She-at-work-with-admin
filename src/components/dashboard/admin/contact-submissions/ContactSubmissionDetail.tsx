// components/dashboard/admin/contact-submissions/ContactSubmissionDetail.tsx
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
  ArrowLeft, Calendar, Check, Mail, MessageSquare,
  Phone, RefreshCw, User, X, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ContactDetail = {
  id:           string;
  name:         string;
  email:        string;
  phone:        string | null;
  subject:      string | null;
  message:      string;
  isResolved:   boolean;
  resolvedAt:   string | null;
  notes:        string | null;
  submittedAt:  string;
  resolverName: string | null;
};

function MetaRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground mt-0.5">{value ?? "—"}</div>
      </div>
    </div>
  );
}

interface Props { id: string }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ContactSubmissionDetail({ id }: Props) {
  const [item,        setItem]        = useState<ContactDetail | null>(null);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [processing,  setProcessing]  = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  // Resolve dialog
  const [resolveOpen,  setResolveOpen]  = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Unresolve confirm dialog
  const [unresolveOpen, setUnresolveOpen] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDetail = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`);
      if (!res.ok) throw new Error("Contact not found");
      const data = await res.json();
      setItem(data.data);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  // ── Resolve ────────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    setProcessing(true);
    setResolveError(null);
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isResolved: true,
          notes:      resolveNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResolveOpen(false);
      setResolveNotes("");
      showToast("Marked as resolved");
      fetchDetail();
    } catch (err: any) {
      setResolveError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── Unresolve ──────────────────────────────────────────────────────────────
  const handleUnresolve = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isResolved: false }),
      });
      if (!res.ok) throw new Error();
      setUnresolveOpen(false);
      showToast("Marked as unresolved");
      fetchDetail();
    } catch {
      showToast("Action failed", false);
    } finally {
      setProcessing(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading message…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">{fetchError ?? "Not found"}</p>
        <Link href="/dashboard/admin/contact-submissions">
          <button className="text-sm text-primary underline">Back to Messages</button>
        </Link>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/dashboard/admin/contact-submissions">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Messages
          </button>
        </Link>

        <div className="flex items-center gap-2">
          {item.isResolved ? (
            <Button variant="outline" size="sm"
              className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => setUnresolveOpen(true)} disabled={processing}>
              <X className="h-3.5 w-3.5" /> Mark Unresolved
            </Button>
          ) : (
            <Button size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => setResolveOpen(true)} disabled={processing}>
              <Check className="h-3.5 w-3.5" /> Mark Resolved
            </Button>
          )}
          {/* Reply via email */}
          <a href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject ?? "Your message")}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Reply by Email
            </Button>
          </a>
        </div>
      </div>

      {/* Resolved banner */}
      {item.isResolved && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">This message has been resolved</p>
            {item.resolvedAt && (
              <p className="text-xs text-green-700 mt-0.5">
                {format(new Date(item.resolvedAt), "PPP p")}
                {item.resolverName ? ` by ${item.resolverName}` : ""}
              </p>
            )}
            {item.notes && (
              <p className="text-xs text-green-800 mt-1.5 leading-relaxed border-t border-green-200 pt-1.5">
                Notes: {item.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Message ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Subject */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                item.isResolved
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              )}>
                {item.isResolved
                  ? <><Check className="h-3 w-3" /> Resolved</>
                  : <><MessageSquare className="h-3 w-3" /> Open</>}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {item.subject ?? <span className="text-muted-foreground italic">No subject</span>}
            </h1>
          </div>

          {/* Message body */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {item.message}
              </p>
            </CardContent>
          </Card>

          {/* Existing notes (if resolved) */}
          {item.isResolved && item.notes && (
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Resolution Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{item.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Sender info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Sender</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetaRow icon={User} label="Name" value={item.name} />
              <MetaRow icon={Mail} label="Email" value={
                <a href={`mailto:${item.email}`}
                  className="text-primary hover:underline break-all">{item.email}</a>
              } />
              {item.phone && (
                <MetaRow icon={Phone} label="Phone" value={
                  <a href={`tel:${item.phone}`}
                    className="text-primary hover:underline">{item.phone}</a>
                } />
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetaRow icon={Calendar} label="Received"
                value={format(new Date(item.submittedAt), "PPP p")} />
              {item.resolvedAt && (
                <MetaRow icon={Calendar} label="Resolved"
                  value={format(new Date(item.resolvedAt), "PPP p")} />
              )}
              {item.resolverName && (
                <MetaRow icon={User} label="Resolved by" value={item.resolverName} />
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject ?? "Your message")}`}
                className="block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Mail className="h-4 w-4" /> Reply by Email
                </Button>
              </a>
              {item.isResolved ? (
                <Button variant="outline" size="sm"
                  className="w-full gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => setUnresolveOpen(true)} disabled={processing}>
                  <X className="h-4 w-4" /> Mark Unresolved
                </Button>
              ) : (
                <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => setResolveOpen(true)} disabled={processing}>
                  <Check className="h-4 w-4" /> Mark Resolved
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Resolve Dialog ───────────────────────────────────────────────── */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Optionally add internal notes about how this was handled.
            </DialogDescription>
          </DialogHeader>

          {/* Submission preview */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.email}</p>
            {item.subject && (
              <p className="text-xs text-muted-foreground italic">&ldquo;{item.subject}&rdquo;</p>
            )}
          </div>

          {resolveError && (
            <p className="text-sm text-red-600">{resolveError}</p>
          )}

          <div>
            <Label htmlFor="resolveNotes" className="mb-1.5 block">
              Resolution Notes
              <span className="text-xs text-muted-foreground ml-1">(optional, internal)</span>
            </Label>
            <Textarea id="resolveNotes" rows={3}
              placeholder="e.g. Replied via email on 12 Jan, directed to support team…"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline"
              onClick={() => { setResolveOpen(false); setResolveNotes(""); }}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={processing}
              className="gap-2 bg-green-600 hover:bg-green-700">
              {processing
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                : <><Check className="h-4 w-4" />Mark Resolved</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unresolve confirm Dialog ─────────────────────────────────────── */}
      <Dialog open={unresolveOpen} onOpenChange={setUnresolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Unresolved?</DialogTitle>
            <DialogDescription>
              This will clear the resolution record and move the message back to the open queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnresolveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnresolve} disabled={processing}>
              {processing
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                : "Mark Unresolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}