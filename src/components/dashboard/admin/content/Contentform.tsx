// src/components/dashboard/admin/content/ContentForm.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, RefreshCw, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ImageUploader from "./ImageUploader";
import RichTextEditor from "./RichTextEditor";
import { TagInput } from "./TagInput";

// ─── Constants (defined outside component — never recreated on render) ─────────

export const CONTENT_TYPES = [
  { value: "BLOG",      label: "Blog"      },
  { value: "NEWS",      label: "News"      },
  { value: "ENTRECHAT", label: "Entrechat" },
  { value: "EVENT",     label: "Event"     },
  { value: "PRESS",     label: "Press"     },
] as const;

export const STATUSES = [
  { value: "DRAFT",     label: "Unpublished" },
  { value: "PENDING",   label: "Pending"     },
  { value: "PUBLISHED", label: "Published"   },
  { value: "REJECTED",  label: "Rejected"    },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ContentFormValues = {
  title:         string;
  content:       string;
  summary:       string;
  contentType:   string;
  categoryId:    string;
  authorName:    string;
  featuredImage: string;
  externalUrl:   string;
  readingTime:   string;
  status:        string;
  tags:          string[];
};

type Category = { id: string; name: string; slug: string; contentType: string };

interface ContentFormProps {
  mode:           "new" | "edit";
  initialValues?: Partial<ContentFormValues>;
  onSubmit:       (values: ContentFormValues) => Promise<void>;
  submitting:     boolean;
  error:          string | null;
}

const EMPTY: ContentFormValues = {
  title: "", content: "", summary: "", contentType: "BLOG",
  categoryId: "", authorName: "", featuredImage: "",
  externalUrl: "", readingTime: "", status: "DRAFT",
  tags: [],
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ContentForm({
  mode, initialValues, onSubmit, submitting, error,
}: ContentFormProps) {
  const [values,     setValues]     = useState<ContentFormValues>({ ...EMPTY, ...initialValues });
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [touched,    setTouched]    = useState<Partial<Record<keyof ContentFormValues, boolean>>>({});

  // Track the contentType that was last used to fetch categories.
  // This lets us skip a fetch when initialValues arrives but contentType hasn't changed.
  const lastFetchedType = useRef<string | null>(null);

  // ── Sync initialValues when they arrive (edit mode) ────────────────────────
  // Use a ref-guarded pattern so we only apply initialValues once on mount/first-load,
  // not on every re-render of the parent.
  const initialApplied = useRef(false);
  useEffect(() => {
    if (!initialValues || initialApplied.current) return;
    initialApplied.current = true;
    setValues({ ...EMPTY, ...initialValues });
  }, [initialValues]);

  // ── Fetch categories when contentType changes ──────────────────────────────
  // Uses AbortController so in-flight requests are cancelled on cleanup.
  useEffect(() => {
    if (!values.contentType) return;
    // Skip fetch if we already have categories for this type
    if (lastFetchedType.current === values.contentType) return;

    const controller = new AbortController();
    lastFetchedType.current = values.contentType;
    setCatLoading(true);

    fetch(
      `/api/admin/categories?contentType=${values.contentType}&activeOnly=true`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setCategories([]);
      })
      .finally(() => setCatLoading(false));

    return () => controller.abort();
  }, [values.contentType]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  // FIX: single setState call — the previous version called setValues twice,
  // meaning the first update was discarded by React's batching.
  const set = (key: keyof ContentFormValues, val: string | string[]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: val };
      // Clear categoryId when contentType changes — old category won't apply
      if (key === "contentType") {
        next.categoryId = "";
        lastFetchedType.current = null; // allow re-fetch for new type
      }
      return next;
    });
  };

  const touch = (key: keyof ContentFormValues) =>
    setTouched((t) => ({ ...t, [key]: true }));

  const fieldError = (key: keyof ContentFormValues): string | null => {
    if (!touched[key]) return null;
    if (key === "title"       && !values.title.trim())   return "Title is required";
    if (key === "content"     && !values.content.trim()) return "Content is required";
    if (key === "contentType" && !values.contentType)    return "Content type is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, content: true, contentType: true });
    if (!values.title.trim() || !values.content.trim() || !values.contentType) return;
    await onSubmit(values);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main content ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          <div>
            <Label htmlFor="title" className="mb-1.5 block">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter a compelling title…"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => touch("title")}
              className={cn(fieldError("title") && "border-red-400 focus-visible:ring-red-400")}
            />
            {fieldError("title") && (
              <p className="text-xs text-red-600 mt-1">{fieldError("title")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="summary" className="mb-1.5 block">
              Summary
              <span className="text-xs text-muted-foreground ml-2">(shown in cards and previews)</span>
            </Label>
            <Textarea
              id="summary"
              rows={3}
              placeholder="A short description that appears in article cards…"
              value={values.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="content" className="mb-1.5 block">
              Content <span className="text-red-500">*</span>
            </Label>
            <RichTextEditor
              value={values.content}
              onChange={(html) => { set("content", html); touch("content"); }}
              placeholder="Write your full article content here…"
              minHeight={420}
              error={!!fieldError("content")}
            />
            {fieldError("content") && (
              <p className="text-xs text-red-600 mt-1">{fieldError("content")}</p>
            )}
          </div>
        </div>

        {/* ── Right: sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={values.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Content Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={values.contentType}
                  onValueChange={(v) => { set("contentType", v); touch("contentType"); }}
                >
                  <SelectTrigger className={cn(fieldError("contentType") && "border-red-400")}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("contentType") && (
                  <p className="text-xs text-red-600 mt-1">{fieldError("contentType")}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                <Select
                  value={values.categoryId || "NONE"}
                  onValueChange={(v) => set("categoryId", v === "NONE" ? "" : v)}
                  disabled={catLoading || categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={catLoading ? "Loading…" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && !catLoading && values.contentType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No categories for this type.{" "}
                    <Link href="/dashboard/admin/categories" className="text-primary underline">
                      Create one
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Tags</Label>
                <TagInput
                  value={values.tags}
                  onChange={(tagIds) => set("tags", tagIds as string[])}
                  disabled={submitting}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Add tags to help organize and search content
                </p>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Author & Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Author Name</Label>
                <Input
                  placeholder="e.g. Jane Smith"
                  value={values.authorName}
                  onChange={(e) => set("authorName", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Reading Time (minutes)</Label>
                <Input
                  type="number" min="1" max="120" placeholder="e.g. 5"
                  value={values.readingTime}
                  onChange={(e) => set("readingTime", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Media & Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploader
                label="Featured Image"
                value={values.featuredImage}
                onChange={(url) => set("featuredImage", url)}
                folder="admin-content"
              />
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  External URL
                  <span className="text-xs text-muted-foreground ml-1">(links out instead of detail page)</span>
                </Label>
                <Input
                  placeholder="https://example.com/article"
                  value={values.externalUrl}
                  onChange={(e) => set("externalUrl", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="h-4 w-4" />{mode === "new" ? "Create Content" : "Save Changes"}</>
              }
            </Button>
            {values.status !== "PUBLISHED" && (
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="w-full gap-2"
                onClick={() => {
                  set("status", "PUBLISHED");
                  setTimeout(() => document.getElementById("content-form-submit")?.click(), 50);
                }}
              >
                <Check className="h-4 w-4" /> Publish Now
              </Button>
            )}
          </div>

        </div>
      </div>

      <button id="content-form-submit" type="submit" className="hidden" />
    </form>
  );
}