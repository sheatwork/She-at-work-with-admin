// components/dashboard/admin/story-submissions/PublishDialog.tsx
// The key piece: lets admin fill in content metadata before publishing.
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Send, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string; contentType: string };

const CONTENT_TYPES = [
  { value: "SUCCESS_STORY", label: "Success Story" },
  { value: "BLOG",          label: "Blog" },
  { value: "NEWS",          label: "News" },
  { value: "ENTRECHAT",     label: "Entrechat" },
  { value: "PRESS",         label: "Press" },
  { value: "RESOURCE",      label: "Resource" },
] as const;

export type PublishPayload = {
  title:        string;
  authorName:   string;
  summary:      string;
  contentType:  string;
  categoryId:   string;
  featuredImage:string;
  readingTime:  string;
  reviewNotes:  string;
};

interface PublishDialogProps {
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  submissionTitle:string;
  submitterName:  string;
  onPublish:      (payload: PublishPayload) => Promise<void>;
  publishing:     boolean;
  error:          string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PublishDialog({
  open, onOpenChange,
  submissionTitle, submitterName,
  onPublish, publishing, error,
}: PublishDialogProps) {

  const [form, setForm] = useState<PublishPayload>({
    title:        "",
    authorName:   "",
    summary:      "",
    contentType:  "SUCCESS_STORY",
    categoryId:   "",
    featuredImage:"",
    readingTime:  "",
    reviewNotes:  "",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // Pre-fill from submission when dialog opens
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        title:      submissionTitle,
        authorName: submitterName,
      }));
    }
  }, [open, submissionTitle, submitterName]);

  // Fetch categories when contentType changes
  useEffect(() => {
    if (!form.contentType) return;
    setCatLoading(true);
    fetch(`/api/admin/categories?contentType=${form.contentType}&activeOnly=true`)
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, [form.contentType]);

  const set = (key: keyof PublishPayload, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    await onPublish(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish as Content</DialogTitle>
          <DialogDescription>
            Fill in the details below. The story body will become the article content.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Title */}
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Article Title <span className="text-red-500">*</span>
            </Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Published article title…" />
          </div>

          {/* Content Type */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Content Type</Label>
            <Select value={form.contentType}
              onValueChange={(v) => { set("contentType", v); set("categoryId", ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
            <Select value={form.categoryId || "NONE"}
              onValueChange={(v) => set("categoryId", v === "NONE" ? "" : v)}
              disabled={catLoading || categories.length === 0}>
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
          </div>

          {/* Author */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Author Name</Label>
            <Input value={form.authorName} onChange={(e) => set("authorName", e.target.value)}
              placeholder="e.g. Jane Smith" />
          </div>

          {/* Reading time */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Reading Time (min)</Label>
            <Input type="number" min="1" max="120" value={form.readingTime}
              onChange={(e) => set("readingTime", e.target.value)}
              placeholder="e.g. 5" />
          </div>

          {/* Summary */}
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Summary / Excerpt</Label>
            <Textarea rows={2} value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="Short description shown in article cards…" />
          </div>

          {/* Featured image */}
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Featured Image URL</Label>
            <Input value={form.featuredImage}
              onChange={(e) => set("featuredImage", e.target.value)}
              placeholder="https://res.cloudinary.com/…" />
            {form.featuredImage && (
              <div className="mt-2 rounded-lg overflow-hidden border h-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.featuredImage} alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>

          {/* Review notes (internal) */}
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Review Notes
              <span className="text-xs text-muted-foreground ml-1">(internal, not shown publicly)</span>
            </Label>
            <Textarea rows={2} value={form.reviewNotes}
              onChange={(e) => set("reviewNotes", e.target.value)}
              placeholder="Optional notes for the team…" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={publishing || !form.title.trim()}
            className="gap-2 bg-green-600 hover:bg-green-700">
            {publishing
              ? <><RefreshCw className="h-4 w-4 animate-spin" />Publishing…</>
              : <><Send className="h-4 w-4" />Publish Story</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}