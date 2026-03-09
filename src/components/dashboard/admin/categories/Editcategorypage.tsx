// components/dashboard/admin/categories/EditCategoryPage.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ArrowLeft, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CategoryForm, { CategoryFormValues } from "./Categoryform";

interface Props { id: string }

export default function EditCategoryPage({ id }: Props) {
  const router = useRouter();

  const [initialValues, setInitialValues] = useState<Partial<CategoryFormValues> | null>(null);
  const [lockedType,    setLockedType]    = useState<string>("");
  const [fetching,      setFetching]      = useState(true);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/admin/categories/${id}`);
        if (!res.ok) throw new Error("Category not found");
        const { data } = await res.json();
        setLockedType(data.contentType);
        setInitialValues({
          name:        data.name        ?? "",
          contentType: data.contentType ?? "BLOG",
          description: data.description ?? "",
          isActive:    data.isActive    ?? true,
        });
      } catch (err: any) {
        setFetchError(err.message);
      } finally {
        setFetching(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        values.name.trim(),
          description: values.description.trim() || null,
          isActive:    values.isActive,
          // contentType intentionally omitted — API rejects it
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update category");
      router.push("/dashboard/admin/categories?updated=1");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading category…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-foreground">{fetchError}</p>
        <Link href="/dashboard/admin/categories">
          <button className="text-sm text-primary underline">Back to Categories</button>
        </Link>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-foreground">Edit Category</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code>
        </p>
      </div>

      {initialValues && (
        <CategoryForm
          mode="edit"
          initialValues={initialValues}
          lockedType={lockedType}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}