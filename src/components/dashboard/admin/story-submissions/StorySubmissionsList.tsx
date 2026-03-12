// components/dashboard/admin/story-submissions/StorySubmissionsList.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  BookOpen, Building2, Check, Eye,
  Mail, RefreshCw, Search,
  User, X, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Submission = {
  id:                 string;
  name:               string;
  email:              string;
  phone:              string | null;
  title:              string;
  businessName:       string | null;
  industry:           string | null;
  status:             string;
  submittedAt:        string;
  reviewedAt:         string | null;
  reviewerName:       string | null;
  publishedContentId: string | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

// ─── Constants (outside component — never recreated on render) ─────────────────

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800 border-green-200",
  PENDING:   "bg-amber-100 text-amber-800 border-amber-200",
  REJECTED:  "bg-red-100 text-red-800 border-red-200",
  DRAFT:     "bg-secondary text-muted-foreground border-border",
};

const STATUS_TABS = ["PENDING", "PUBLISHED", "REJECTED", "ALL"] as const;

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

// ─── Component ─────────────────────────────────────────────────────────────────

export default function StorySubmissionsList() {
  const searchParams = useSearchParams();

  const [items,      setItems]      = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page:1, limit:20, total:0, totalPages:0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [status,     setStatus]     = useState(searchParams.get("status") ?? "PENDING");
  const [search,     setSearch]     = useState("");
  const [debSearch,  setDebSearch]  = useState("");
  const [page,       setPage]       = useState(1);
  const [toast,      setToast]      = useState<string | null>(null);

  const debRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  // FIX: track toast timeout so overlapping toasts are properly cleared
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: useCallback + clear previous timeout before setting new one
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  // Show toast on redirect back from detail page
  useEffect(() => {
    const msg = searchParams.get("msg");
    if (msg) showToast(decodeURIComponent(msg));
  }, [searchParams, showToast]);

  // Debounce search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [search]);

  // FIX: reset page when status tab changes — kept as separate effect so
  // fetchData dependency array stays stable and doesn't cause an extra call
  useEffect(() => { setPage(1); }, [status]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (status && status !== "ALL") sp.set("status", status);
      if (debSearch) sp.set("search", debSearch);

      const res = await fetch(`/api/admin/story-submissions?${sp}`, {
        signal: abortRef.current.signal,
      });
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
  }, [page, status, debSearch]);

  // FIX: single useEffect with abort cleanup — no duplicate calls
  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-600 text-white shadow-lg text-sm font-medium">
          <Check className="h-4 w-4" /> {toast}
        </div>
      )}

      {/* Search + refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, email or business…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s === "ALL" ? "" : s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              (status === s || (s === "ALL" && !status))
                ? "bg-primary text-white border-primary"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {pagination.total} submission{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-52">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <XCircle className="h-9 w-9 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load submissions</p>
          <Button variant="outline" size="sm" onClick={fetchData}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <BookOpen className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {status === "PENDING" || !status
              ? "No pending submissions to review"
              : "No submissions found"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submission</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Submitter</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Business</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Submitted</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">

                  {/* Title */}
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                    {item.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.industry}</p>
                    )}
                  </td>

                  {/* Submitter */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{item.email}</span>
                    </div>
                  </td>

                  {/* Business */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {item.businessName ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{item.businessName}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                    {item.status === "PUBLISHED" && item.publishedContentId && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Content created</p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.submittedAt), "MMM d, yyyy")}
                    {item.reviewedAt && (
                      <p className="text-[10px] mt-0.5">
                        Reviewed {format(new Date(item.reviewedAt), "MMM d")}
                        {item.reviewerName ? ` by ${item.reviewerName}` : ""}
                      </p>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/admin/story-submissions/${item.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8">
                        <Eye className="h-3.5 w-3.5" /> Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
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
  );
}