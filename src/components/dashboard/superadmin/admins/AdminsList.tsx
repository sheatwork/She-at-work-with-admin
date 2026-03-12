// components/dashboard/superadmin/admins/AdminsList.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Check,
  Mail, Phone,
  Plus, RefreshCw, Search,
  Shield, ShieldOff, UserCheck,
  UserMinus, X, XCircle
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Admin = {
  id:            string;
  name:          string;
  email:         string;
  mobile:        string | null;
  isActive:      boolean;
  emailVerified: string | null;
  createdAt:     string;
  updatedAt:     string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

// ─── Constants (outside component) ────────────────────────────────────────────

const STATUS_TABS = ["ALL", "active", "inactive"] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminsList() {
  const [items,      setItems]      = useState<Admin[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page:1, limit:20, total:0, totalPages:0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [search,     setSearch]     = useState("");
  const [debSearch,  setDebSearch]  = useState("");
  const [status,     setStatus]     = useState<string>("ALL");
  const [page,       setPage]       = useState(1);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionId,   setActionId]   = useState<string | null>(null); // loading state per row

  const debRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ msg, ok });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  // Debounce search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { setDebSearch(search); setPage(1); }, 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [status]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: "20" });
      if (debSearch)          sp.set("search", debSearch);
      if (status !== "ALL")   sp.set("status", status);

      const res = await fetch(`/api/superadmin/admins?${sp}`, {
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

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  // ── Toggle active/inactive ─────────────────────────────────────────────────
  const handleToggleActive = async (admin: Admin) => {
    setActionId(admin.id);
    try {
      const res = await fetch(`/api/superadmin/admins/${admin.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !admin.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      showToast(`${admin.name} ${!admin.isActive ? "activated" : "deactivated"}`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setActionId(null);
    }
  };

  // ── Demote to USER ─────────────────────────────────────────────────────────
  const handleDemote = async (admin: Admin) => {
    if (!confirm(`Remove admin access for ${admin.name}? They will be demoted to a regular user.`)) return;
    setActionId(admin.id);
    try {
      const res = await fetch(`/api/superadmin/admins/${admin.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      showToast(data.message ?? `${admin.name} demoted to user`);
      fetchData();
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">

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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
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
        <Link href="/dashboard/superadmin/admins/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Admin
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",
              status === s
                ? "bg-primary text-white border-primary"
                : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {s === "ALL" ? "All" : s}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {pagination.total} admin{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-52">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <XCircle className="h-9 w-9 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load admins</p>
          <Button variant="outline" size="sm" onClick={fetchData}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-3">
          <Shield className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No admins found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((admin) => {
                const busy = actionId === admin.id;
                return (
                  <tr key={admin.id} className="border-b hover:bg-muted/20 transition-colors">

                    {/* Name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{admin.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{admin.emailVerified ? "Verified" : "Unverified"}</span>
                        </div>
                        {admin.mobile && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{admin.mobile}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                        admin.isActive
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      )}>
                        {admin.isActive
                          ? <><UserCheck className="h-3 w-3" /> Active</>
                          : <><ShieldOff className="h-3 w-3" /> Inactive</>}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(admin.createdAt), "MMM d, yyyy")}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/superadmin/admins/${admin.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline" size="sm"
                          className={cn(
                            "h-8 gap-1 text-xs",
                            admin.isActive
                              ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                              : "text-green-600 border-green-200 hover:bg-green-50"
                          )}
                          onClick={() => handleToggleActive(admin)}
                          disabled={busy}
                        >
                          {busy
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : admin.isActive
                              ? <><ShieldOff className="h-3 w-3" /> Deactivate</>
                              : <><UserCheck className="h-3 w-3" /> Activate</>}
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="h-8 gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDemote(admin)}
                          disabled={busy}
                        >
                          <UserMinus className="h-3 w-3" /> Demote
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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