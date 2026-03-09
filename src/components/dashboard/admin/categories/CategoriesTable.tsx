// components/dashboard/admin/categories/CategoriesTable.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Check, Edit, Filter, FolderOpen, RefreshCw,
  Search, Trash2, X, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  id:          string;
  name:        string;
  slug:        string;
  contentType: string;
  description: string | null;
  isActive:    boolean;
  createdAt:   string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  "BLOG","NEWS","ENTRECHAT","EVENT","PRESS","SUCCESS_STORY","RESOURCE",
] as const;

const TYPE_STYLES: Record<string, string> = {
  BLOG:          "bg-purple-100 text-purple-800",
  NEWS:          "bg-blue-100 text-blue-800",
  ENTRECHAT:     "bg-pink-100 text-pink-800",
  SUCCESS_STORY: "bg-emerald-100 text-emerald-800",
  RESOURCE:      "bg-indigo-100 text-indigo-800",
  EVENT:         "bg-orange-100 text-orange-800",
  PRESS:         "bg-cyan-100 text-cyan-800",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CategoriesTable() {
  const [items,       setItems]       = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [search,      setSearch]      = useState("");
  const [debouncedQ,  setDebouncedQ]  = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterActive,setFilterActive]= useState<"all"|"active"|"inactive">("all");
  const [processing,  setProcessing]  = useState<string | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<Category | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Fetch — always load all (filter client-side for fast UX, total count is small)
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/categories?activeOnly=false");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Client-side filter
  const filtered = items.filter((c) => {
    const q = debouncedQ.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
    if (filterType && c.contentType !== filterType) return false;
    if (filterActive === "active"   && !c.isActive) return false;
    if (filterActive === "inactive" &&  c.isActive) return false;
    return true;
  });

  // Toggle active/inactive (soft delete = set isActive=false)
  const toggleActive = async (cat: Category) => {
    setProcessing(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      if (!res.ok) throw new Error();
      showToast(`"${cat.name}" ${cat.isActive ? "deactivated" : "activated"}`);
      fetchAll();
    } catch {
      showToast("Action failed", false);
    } finally {
      setProcessing(null);
    }
  };

  // Hard delete via soft-delete API (sets isActive=false permanently in UI flow)
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(`"${deleteTarget.name}" deactivated`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      showToast("Failed to delete", false);
    } finally {
      setProcessing(null);
    }
  };

  const clearFilters = () => { setSearch(""); setFilterType(""); setFilterActive("all"); };
  const isFiltered = !!search || !!filterType || filterActive !== "all";

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
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search categories…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <Select value={filterType || "ALL"} onValueChange={(v) => setFilterType(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {CONTENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t.toLowerCase().replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter */}
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v as typeof filterActive)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchAll} disabled={loading} title="Refresh">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-primary">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} of {items.length} categor{items.length !== 1 ? "ies" : "y"}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <XCircle className="h-9 w-9 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load categories</p>
          <Button variant="outline" size="sm" onClick={fetchAll}>Try again</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <FolderOpen className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isFiltered ? "No categories match your filters." : "No categories yet."}
          </p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat) => (
                <tr key={cat.id} className={cn(
                  "border-b transition-colors hover:bg-muted/20",
                  !cat.isActive && "opacity-60"
                )}>
                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{cat.name}</p>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      TYPE_STYLES[cat.contentType] ?? "bg-secondary text-muted-foreground"
                    )}>
                      {cat.contentType.toLowerCase().replace("_", " ")}
                    </span>
                  </td>

                  {/* Slug */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {cat.slug}
                    </code>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {cat.description ?? "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                      cat.isActive
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-secondary text-muted-foreground border-border"
                    )}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(cat.createdAt), "MMM d, yyyy")}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <Link href={`/dashboard/admin/categories/${cat.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>

                      {/* Toggle active */}
                      <Button variant="ghost" size="sm"
                        className={cn(
                          "h-8 w-8 p-0",
                          cat.isActive
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        )}
                        onClick={() => toggleActive(cat)}
                        disabled={processing === cat.id}
                        title={cat.isActive ? "Deactivate" : "Activate"}>
                        {processing === cat.id
                          ? <RefreshCw className="h-4 w-4 animate-spin" />
                          : cat.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>

                      {/* Delete */}
                      <Button variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(cat)}
                        disabled={processing === cat.id}
                        title="Delete">
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

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Category</DialogTitle>
            <DialogDescription>
              This will soft-delete the category. Existing content linked to it won&apos;t be affected.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="font-medium text-sm text-amber-900">{deleteTarget.name}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {deleteTarget.contentType.toLowerCase().replace("_", " ")} · {deleteTarget.slug}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing === deleteTarget?.id}>
              {processing === deleteTarget?.id
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deactivating…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Deactivate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}