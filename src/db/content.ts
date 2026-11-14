// lib/db/content.ts
// ─────────────────────────────────────────────────────────────────────────
// Direct database access for initial page loads.
// Used by Server Components to avoid HTTP roundtrip + Vercel function overhead.
// ─────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { db } from "@/db";
import { ContentTable, CategoriesTable } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export type ContentType =
  | "BLOG"
  | "NEWS"
  | "ENTRECHAT"
  | "EVENT"
  | "PRESS"
  | "SUCCESS_STORY"
  | "RESOURCE";

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: Date | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
  createdAt:string;
};

export type PageContentResponse = {
  items: ContentRow[];
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  categories: Array<{ id: string; name: string; slug: string }>;
  readingTimes: string[];
};

/**
 * Lightweight fetch for homepage carousels.
 * Returns minimal set of fields (no tags).
 *
 * ✅ Perfect for carousels and featured sections
 *
 * @param contentType - Type of content to fetch
 * @param limit - Number of items to return (default 5)
 * @returns Array of content items with minimal fields
 */
export const fetchPageContentMinimal = cache(async (
  contentType: ContentType,
  limit: number = 5,
): Promise<{ items: Partial<ContentRow>[] }> => {
  try {
    const rows = await db
      .select({
        id: ContentTable.id,
        title: ContentTable.title,
        slug: ContentTable.slug,
        summary: ContentTable.summary,
        featuredImage: ContentTable.featuredImage,
        publishedAt: ContentTable.publishedAt,
        authorName: ContentTable.authorName,
        categoryName: CategoriesTable.name,
        readingTime: ContentTable.readingTime,
        createdAt :ContentTable.createdAt
      })
      .from(ContentTable)
      .leftJoin(
        CategoriesTable,
        eq(ContentTable.categoryId, CategoriesTable.id)
      )
      .where(
        and(
          eq(ContentTable.contentType, contentType),
          eq(ContentTable.status, "PUBLISHED")
        )
      )
      .orderBy(desc(ContentTable.createdAt))
      .limit(limit);

    return { items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })) };
  } catch (err) {
    console.error(`[fetchPageContentMinimal] Error fetching ${contentType}:`, err);
    // Rethrow instead of returning an empty result. Public pages are now cached
    // with a long/indefinite `revalidate` (on-demand invalidation in
    // lib/revalidate.ts pushes real updates), so an empty-on-error return would
    // be written into the ISR cache and served as a permanently blank page.
    // A thrown error is not cached — the next request retries the database.
    throw err;
  }
});
/**
 * Slugs for a content type, newest first — feeds `generateStaticParams`.
 *
 * Without a `generateStaticParams` export, Next.js does not register a dynamic
 * segment for ISR at all: the route is marked `ƒ` and server-rendered on every
 * request, so each article view would keep hitting Neon. Exporting it (even
 * with a bounded list) registers the route with a blocking fallback, so slugs
 * outside the list are still generated once on first request and then cached.
 *
 * Bounded deliberately: prerendering every article would make each deploy issue
 * thousands of queries for little benefit. Recent posts get prebuilt; the long
 * tail is cached on first view.
 */
export async function fetchSlugsByContentType(
  contentType: ContentType,
  limit: number = 100,
): Promise<string[]> {
  try {
    const rows = await db
      .select({ slug: ContentTable.slug })
      .from(ContentTable)
      .where(
        and(
          eq(ContentTable.contentType, contentType),
          eq(ContentTable.status, "PUBLISHED"),
        ),
      )
      .orderBy(desc(ContentTable.createdAt))
      .limit(limit);

    return rows.map((r) => r.slug).filter(Boolean);
  } catch (err) {
    console.error(`[fetchSlugsByContentType] ${contentType}:`, err);
    // Empty list still registers the route for ISR — everything renders on
    // demand once, then caches. Never fail the build over this.
    return [];
  }
}
