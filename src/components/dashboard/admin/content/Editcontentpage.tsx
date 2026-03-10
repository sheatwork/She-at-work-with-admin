// src/components/dashboard/admin/content/EditContentPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ContentForm, { ContentFormValues } from "./Contentform";


interface EditContentPageProps {
  id: string;
}

export default function EditContentPage({ id }: EditContentPageProps) {
  const router = useRouter();

  const [initialValues, setInitialValues] = useState<Partial<ContentFormValues> | null>(null);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [fetching,      setFetching]      = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [slug,          setSlug]          = useState<string>("");
  const [contentType,   setContentType]   = useState<string>("");

  // ── Load existing content ──────────────────────────────────────────────────
useEffect(() => {
  (async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/content/${id}`);
      if (!res.ok) throw new Error("Content not found");
      const { data } = await res.json();

      setSlug(data.slug ?? "");
      setContentType(data.contentType ?? "");

      setInitialValues({
        title:        data.title        ?? "",
        content:      data.content      ?? "",
        summary:      data.summary      ?? "",
        contentType:  data.contentType  ?? "BLOG",
        categoryId:   data.categoryId   ?? "",
        authorName:   data.authorName   ?? "",
        featuredImage:data.featuredImage?? "",
        externalUrl:  data.externalUrl  ?? "",
        readingTime:  data.readingTime  ? String(data.readingTime) : "",
        status:       data.status       ?? "DRAFT",
        tags:         data.tags?.map((t: any) => t.id) ?? [], // Add this
      });
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setFetching(false);
    }
  })();
}, [id]);

const handleSubmit = async (values: ContentFormValues) => {
  setSubmitting(true);
  setSubmitError(null);
  try {
    const res = await fetch(`/api/admin/content/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:        values.title.trim(),
        content:      values.content,
        summary:      values.summary.trim()    || null,
        categoryId:   values.categoryId        || null,
        authorName:   values.authorName.trim() || null,
        featuredImage:values.featuredImage.trim() || null,
        externalUrl:  values.externalUrl.trim()   || null,
        readingTime:  values.readingTime ? Number(values.readingTime) : null,
        status:       values.status,
        tags:         values.tags, // Add this
      }),
    });

    // ... rest of the code
  

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update content");

      router.push(`/dashboard/admin/content/${id}/view?updated=1`);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading content…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="text-foreground font-medium">{fetchError}</p>
        <Link href="/dashboard/admin/content">
          <button className="text-sm text-primary underline">Back to Content</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/admin/content/${id}/view`}>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to View
            </button>
          </Link>
        </div>
        {/* Link to public page if published */}
        {contentType && slug && (
          <Link
            href={`/${contentType.toLowerCase()}s/${slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View public page
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code>
        </p>
      </div>

      {initialValues && (
        <ContentForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}