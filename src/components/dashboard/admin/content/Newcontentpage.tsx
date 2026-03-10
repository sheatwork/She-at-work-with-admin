// src/components/dashboard/admin/content/NewContentPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ContentForm, { ContentFormValues } from "./Contentform";


export default function NewContentPage() {
  const router    = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

const handleSubmit = async (values: ContentFormValues) => {
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch("/api/admin/content", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:        values.title.trim(),
        content:      values.content,
        summary:      values.summary.trim()   || null,
        contentType:  values.contentType,
        categoryId:   values.categoryId       || null,
        authorName:   values.authorName.trim()|| null,
        featuredImage:values.featuredImage.trim() || null,
        externalUrl:  values.externalUrl.trim()   || null,
        readingTime:  values.readingTime ? Number(values.readingTime) : null,
        status:       values.status,
        tags:         values.tags, // Add this
      }),
    });

    // ... rest of the cod

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create content");

      router.push(`/dashboard/admin/content?created=1`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/content">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Content
          </button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Content</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new article, blog post, news item, or resource
        </p>
      </div>

      <ContentForm
        mode="new"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}