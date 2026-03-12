// components/dashboard/superadmin/admins/CreateAdminPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateAdminPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showPass,   setShowPass]   = useState(false);

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    password: "",
    mobile:   "",
  });

  const set = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/admins", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim(),
          password: form.password,
          mobile:   form.mobile.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create admin");
      router.push("/dashboard/superadmin/admins?created=1");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/superadmin/admins">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Admins
          </button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new admin account with platform access
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Jane Smith"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
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
            <p className="text-xs text-muted-foreground">
              The account will be created as verified — no email confirmation needed.
            </p>
          </div>

          {/* Mobile (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="mobile">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="mobile"
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Permissions note */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Admin permissions include:</p>
            <p>• Manage content, categories, story submissions, contact messages</p>
            <p>• Cannot access Super Admin controls (user/admin management, analytics)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/superadmin/admins" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting} className="flex-1 gap-2">
              {submitting
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating…</>
                : <><Shield className="h-4 w-4" /> Create Admin</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}