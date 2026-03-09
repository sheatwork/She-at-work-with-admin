// components/dashboard/admin/categories/CreateCategoryPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CategoryForm, { CategoryFormValues } from "./Categoryform";


export default function CreateCategoryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        values.name.trim(),
          contentType: values.contentType,
          description: values.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create category");
      router.push("/dashboard/admin/categories?created=1");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/categories">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Category</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new category to organise content on the platform
        </p>
      </div>

      <CategoryForm
        mode="create"
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}