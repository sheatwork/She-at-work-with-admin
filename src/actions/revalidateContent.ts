// app/actions/revalidateContent.ts
// Server action — call this from your admin panel after saving/updating a post.
// Instantly busts the ISR cache for that specific slug — no waiting for TTL.
//
// HOW TO USE in your admin content editor:
//
//   import { revalidateContentAction } from "@/app/actions/revalidateContent";
//
//   // After successful save:
//   await revalidateContentAction(slug);
//
// This works because fetchDetail uses tags: [`content-${slug}`]
// revalidateTag finds all cached fetch() calls with that tag and invalidates them.
// Next.js then re-renders the detail page on the next request.

"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function revalidateContentAction(slug: string): Promise<void> {
  // Security: only admins can bust the cache
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

  // Bust the detail page cache for this specific slug
  revalidateTag(`content-${slug}`);

  // Also bust the listing pages so the updated content appears in grids
  // This triggers ISR re-render on next visit (not immediate, but within seconds)
  revalidatePath("/news");
  revalidatePath("/blogs");
  revalidatePath("/entrechat");
  revalidatePath("/events");
  revalidatePath("/about/press-room");
}

/**
 * Revalidate all content listing pages at once.
 * Call this after bulk imports or category changes.
 */
export async function revalidateAllContentAction(): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized");
  }

  revalidatePath("/news");
  revalidatePath("/blogs");
  revalidatePath("/entrechat");
  revalidatePath("/events");
  revalidatePath("/about/press-room");
  revalidatePath("/");
}