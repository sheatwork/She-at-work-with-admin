// components/dashboard/superadmin/admins/EditAdminPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft, Eye, EyeOff, Mail,
  RefreshCw, Shield, ShieldOff,
  UserCheck, UserMinus, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Props { id: string }

type AdminDetail = {
  id:            string;
  name:          string;
  email:         string;
  mobile:        string | null;
  isActive:      boolean;
  emailVerified: string | null;
  createdAt:     string;
  updatedAt:     string;
};

export default function EditAdminPage({ id }: Props) {
  const router = useRouter();

  const [admin,       setAdmin]       = useState<AdminDetail | null>(null);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPass,    setShowPass]    = useState(false);
  const [demoting,    setDemoting]    = useState(false);
  const [toggling,    setToggling]    = useState(false);

  const [form, setForm] = useState({
    name:     "",
    mobile:   "",
    password: "", // blank = don't change
  });

  // ── Fetch admin ────────────────────────────────────────────────────────────
  const fetchAdmin = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res  = await fetch(`/api/superadmin/admins/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setAdmin(data.data);
      setForm({ name: data.data.name, mobile: data.data.mobile ?? "", password: "" });
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => { fetchAdmin(); }, [fetchAdmin]);

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Save changes ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: any = {
        name:   form.name.trim(),
        mobile: form.mobile.trim() || null,
      };
      if (form.password) payload.password = form.password;

      const res  = await fetch(`/api/superadmin/admins/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      router.push("/dashboard/superadmin/admins?updated=1");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!admin) return;
    setToggling(true);
    try {
      const res  = await fetch(`/api/superadmin/admins/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !admin.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      fetchAdmin();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setToggling(false);
    }
  };

  // ── Demote ─────────────────────────────────────────────────────────────────
  const handleDemote = async () => {
    if (!admin) return;
    if (!confirm(`Remove admin access for ${admin.name}? They will become a regular user.`)) return;
    setDemoting(true);
    try {
      const res  = await fetch(`/api/superadmin/admins/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      router.push("/dashboard/superadmin/admins?demoted=1");
    } catch (err: any) {
      setSubmitError(err.message);
      setDemoting(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">{fetchError ?? "Admin not found"}</p>
        <Link href="/dashboard/superadmin/admins">
          <button className="text-sm text-primary underline">Back to Admins</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/superadmin/admins">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Admins
          </button>
        </Link>
      </div>

      {/* Header with status */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{admin.name}</h1>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
          admin.isActive
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-red-100 text-red-800 border-red-200"
        )}>
          {admin.isActive
            ? <><UserCheck className="h-3 w-3" /> Active</>
            : <><ShieldOff className="h-3 w-3" /> Inactive</>}
        </span>
      </div>

      {/* Meta info */}
      <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span>Email {admin.emailVerified ? "verified" : "not verified"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          <span>Admin since {format(new Date(admin.createdAt), "PPP")}</span>
        </div>
        {admin.updatedAt !== admin.createdAt && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Last updated {format(new Date(admin.updatedAt), "PPP")}</span>
          </div>
        )}
      </div>

      {/* Edit form */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">Edit Details</h2>

        {submitError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Mobile */}
          <div className="space-y-1.5">
            <Label htmlFor="mobile">
              Phone <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="mobile"
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">
              New Password <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min. 8 characters"
                minLength={form.password ? 8 : undefined}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/superadmin/admins" className="flex-1">
              <Button type="button" variant="outline" className="w-full">Cancel</Button>
            </Link>
            <Button type="submit" disabled={submitting} className="flex-1 gap-2">
              {submitting
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-card rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>

        {/* Toggle active */}
        <div className="flex items-center justify-between gap-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">
              {admin.isActive ? "Deactivate account" : "Activate account"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {admin.isActive
                ? "Prevents the admin from logging in without deleting the account"
                : "Restores login access for this admin"}
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            className={cn(
              "gap-1.5 shrink-0",
              admin.isActive
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-green-600 border-green-200 hover:bg-green-50"
            )}
            onClick={handleToggleActive}
            disabled={toggling}
          >
            {toggling
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : admin.isActive
                ? <><ShieldOff className="h-3.5 w-3.5" /> Deactivate</>
                : <><UserCheck className="h-3.5 w-3.5" /> Activate</>}
          </Button>
        </div>

        {/* Demote */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div>
            <p className="text-sm font-medium text-foreground">Remove admin access</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Demotes this account to a regular user. Their content remains intact.
            </p>
          </div>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 shrink-0 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDemote}
            disabled={demoting}
          >
            {demoting
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <><UserMinus className="h-3.5 w-3.5" /> Demote to User</>}
          </Button>
        </div>
      </div>
    </div>
  );
}