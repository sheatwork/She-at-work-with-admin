// components/dashboard/admin/categories/CategoryForm.tsx
// Shared form for Create and Edit category pages.
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RefreshCw, Save, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPES = [
  { value: "BLOG",          label: "Blog" },
  { value: "NEWS",          label: "News" },
  { value: "ENTRECHAT",     label: "Entrechat" },
  { value: "EVENT",         label: "Event" },
  { value: "PRESS",         label: "Press" },
  { value: "SUCCESS_STORY", label: "Success Story" },
  { value: "RESOURCE",      label: "Resource" },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CategoryFormValues = {
  name:        string;
  contentType: string;
  description: string;
  isActive:    boolean;
};

export interface CategoryFormProps {
  mode:           "create" | "edit";
  initialValues?: Partial<CategoryFormValues>;
  /** contentType is locked after creation */
  lockedType?:    string;
  onSubmit:       (values: CategoryFormValues) => Promise<void>;
  submitting:     boolean;
  error:          string | null;
}

function toPreviewSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "your-category-slug";
}

const EMPTY: CategoryFormValues = {
  name: "", contentType: "BLOG", description: "", isActive: true,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CategoryForm({
  mode, initialValues, lockedType, onSubmit, submitting, error,
}: CategoryFormProps) {
  const [values,  setValues]  = useState<CategoryFormValues>({ ...EMPTY, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialValues) setValues({ ...EMPTY, ...initialValues });
  }, [initialValues]);

  const set = (key: keyof CategoryFormValues, val: string | boolean) =>
    setValues((v) => ({ ...v, [key]: val }));

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  const nameError = touched.name && !values.name.trim() ? "Name is required" : null;
  const typeError = touched.contentType && !values.contentType ? "Content type is required" : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, contentType: true });
    if (!values.name.trim() || !values.contentType) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main fields ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Name */}
          <div>
            <Label htmlFor="cat-name" className="mb-1.5 block">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input id="cat-name"
              placeholder="e.g. Women in Tech"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => touch("name")}
              className={cn(nameError && "border-red-400 focus-visible:ring-red-400")} />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            {/* Slug preview */}
            {values.name && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Slug: <code className="bg-muted px-1.5 py-0.5 rounded">{toPreviewSlug(values.name)}</code>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="cat-desc" className="mb-1.5 block">
              Description
              <span className="text-xs text-muted-foreground ml-2">(optional)</span>
            </Label>
            <Textarea id="cat-desc" rows={4}
              placeholder="Describe what kind of content belongs in this category…"
              value={values.description}
              onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>

        {/* ── Right: settings sidebar ────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Type + status card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Content type */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Content Type <span className="text-red-500">*</span>
                </Label>
                {lockedType ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {lockedType.toLowerCase().replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      locked
                    </span>
                  </div>
                ) : (
                  <>
                    <Select value={values.contentType}
                      onValueChange={(v) => { set("contentType", v); touch("contentType"); }}>
                      <SelectTrigger className={cn(typeError && "border-red-400")}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {typeError && <p className="text-xs text-red-600 mt-1">{typeError}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Cannot be changed after creation.
                    </p>
                  </>
                )}
              </div>

              {/* Active toggle (edit only) */}
              {mode === "edit" && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-muted-foreground">Inactive categories are hidden from authors</p>
                  </div>
                  <Switch
                    checked={values.isActive}
                    onCheckedChange={(v) => set("isActive", v)} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
              <p>Categories group content by topic and content type.</p>
              <p>The slug is auto-generated from the name and must be unique per content type.</p>
              {mode === "edit" && (
                <p>Renaming will auto-update the slug — make sure no existing links depend on it.</p>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" disabled={submitting} className="w-full gap-2">
            {submitting
              ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
              : <><Save className="h-4 w-4" />{mode === "create" ? "Create Category" : "Save Changes"}</>}
          </Button>
        </div>
      </div>
    </form>
  );
}