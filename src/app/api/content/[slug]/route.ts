import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ContentTable,
  CategoriesTable,
  TagsTable,
  ContentTagsTable,
} from "@/db/schema";
import { and, eq, ne, inArray, desc } from "drizzle-orm";

/**
 * CDN caching
 * 5 minutes cache
 * 10 minutes stale
 */
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    /**
     * 1️⃣ Fetch main blog
     */
    const [item] = await db
      .select({
        id: ContentTable.id,
        title: ContentTable.title,
        slug: ContentTable.slug,
        summary: ContentTable.summary,
        content: ContentTable.content,
        featuredImage: ContentTable.featuredImage,
        externalUrl: ContentTable.externalUrl,
        readingTime: ContentTable.readingTime,
        publishedAt: ContentTable.publishedAt,
        authorName: ContentTable.authorName,
        contentType: ContentTable.contentType,
        categoryId: ContentTable.categoryId,
        categoryName: CategoriesTable.name,
        categorySlug: CategoriesTable.slug,
      })
      .from(ContentTable)
      .leftJoin(
        CategoriesTable,
        eq(ContentTable.categoryId, CategoriesTable.id)
      )
      .where(
        and(
          eq(ContentTable.slug, slug),
          eq(ContentTable.status, "PUBLISHED")
        )
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    /**
     * 2️⃣ Fetch tags + related posts in parallel
     */
    const tagsQuery = db
      .select({
        id: TagsTable.id,
        name: TagsTable.name,
        slug: TagsTable.slug,
      })
      .from(ContentTagsTable)
      .innerJoin(
        TagsTable,
        eq(ContentTagsTable.tagId, TagsTable.id)
      )
      .where(eq(ContentTagsTable.contentId, item.id));

    const relatedQuery = item.categoryId
      ? db
          .select({
            id: ContentTable.id,
            title: ContentTable.title,
            slug: ContentTable.slug,
            summary: ContentTable.summary,
            featuredImage: ContentTable.featuredImage,
            readingTime: ContentTable.readingTime,
            publishedAt: ContentTable.publishedAt,
            authorName: ContentTable.authorName,
            categoryName: CategoriesTable.name,
            categorySlug: CategoriesTable.slug,
          })
          .from(ContentTable)
          .leftJoin(
            CategoriesTable,
            eq(ContentTable.categoryId, CategoriesTable.id)
          )
          .where(
            and(
              eq(ContentTable.contentType, item.contentType),
              eq(ContentTable.status, "PUBLISHED"),
              eq(ContentTable.categoryId, item.categoryId!),
              ne(ContentTable.id, item.id)
            )
          )
          .orderBy(desc(ContentTable.publishedAt))
          .limit(3)
      : Promise.resolve([]);

    const [tags, relatedRows] = await Promise.all([
      tagsQuery,
      relatedQuery,
    ]);

    /**
     * 3️⃣ Batch fetch tags for related posts
     */
    const relatedTagMap: Record<
      string,
      { id: string; name: string; slug: string }[]
    > = {};

    if (relatedRows.length > 0) {
      const relatedTagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          tagId: TagsTable.id,
          tagName: TagsTable.name,
          tagSlug: TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(
          TagsTable,
          eq(ContentTagsTable.tagId, TagsTable.id)
        )
        .where(
          inArray(
            ContentTagsTable.contentId,
            relatedRows.map((r) => r.id)
          )
        );

      for (const tag of relatedTagRows) {
        if (!relatedTagMap[tag.contentId]) {
          relatedTagMap[tag.contentId] = [];
        }

        relatedTagMap[tag.contentId].push({
          id: tag.tagId,
          name: tag.tagName,
          slug: tag.tagSlug,
        });
      }
    }

    /**
     * 4️⃣ Final response
     */
    return NextResponse.json(
      {
        item: {
          ...item,
          tags,
        },
        related: relatedRows.map((r) => ({
          ...r,
          tags: relatedTagMap[r.id] ?? [],
        })),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("[GET /api/content/[slug]]", error);

    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}