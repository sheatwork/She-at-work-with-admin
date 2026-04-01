// components/content/fetchContent.ts
// Server component calls DB directly — no HTTP self-fetch.

import { db } from "@/db";
import { CategoriesTable, ContentTable, ContentTagsTable, TagsTable } from "@/db/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { BaseApiResponse, ContentType, EntreChatApiResponse } from "./types";

export async function fetchInitialContent(
  contentType: ContentType,
  limit = 12,
): Promise<BaseApiResponse | EntreChatApiResponse | null> {
  try {
    const [rows, [{ total }], categories] = await Promise.all([
      db
        .select({
          id:           ContentTable.id,
          title:        ContentTable.title,
          slug:         ContentTable.slug,
          summary:      ContentTable.summary,
          featuredImage: ContentTable.featuredImage,
          externalUrl:  ContentTable.externalUrl,
          readingTime:  ContentTable.readingTime,
          publishedAt:  ContentTable.publishedAt,
          authorName:   ContentTable.authorName,
          categoryId:   ContentTable.categoryId,
          categoryName: CategoriesTable.name,
          categorySlug: CategoriesTable.slug,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .where(
          and(
            eq(ContentTable.contentType, contentType),
            eq(ContentTable.status, "PUBLISHED"),
          ),
        )
        .orderBy(desc(ContentTable.publishedAt))
        .limit(limit),

      db
        .select({ total: count() })
        .from(ContentTable)
        .where(
          and(
            eq(ContentTable.contentType, contentType),
            eq(ContentTable.status, "PUBLISHED"),
          ),
        ),

      db
        .select({
          id:   CategoriesTable.id,
          name: CategoriesTable.name,
          slug: CategoriesTable.slug,
        })
        .from(CategoriesTable)
        .where(
          and(
            eq(CategoriesTable.contentType, contentType),
            eq(CategoriesTable.isActive, true),
          ),
        )
        .orderBy(CategoriesTable.name),
    ]);

    const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};
    if (rows.length > 0) {
      const contentIds = rows.map((r) => r.id);
      const tagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          tagId:     TagsTable.id,
          tagName:   TagsTable.name,
          tagSlug:   TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(inArray(ContentTagsTable.contentId, contentIds));

      for (const t of tagRows) {
        if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
        tagMap[t.contentId].push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
      }
    }

    const totalItems = Number(total);

    return {
      items: rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      hasMore: rows.length < totalItems,
      page: 1,
      limit,
      categories,
      readingTimes: [],
      suggestionCandidates: [], // initial load has no search active
    } as BaseApiResponse;
  } catch (err) {
    console.error("[fetchInitialContent] Error:", err);
    return null;
  }
}