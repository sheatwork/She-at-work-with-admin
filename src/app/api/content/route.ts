/*eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import {
  CategoriesTable,
  ContentTable,
  ContentTagsTable,
  TagsTable,
} from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  SQL
} from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = "sin1";

type ContentType =
  | "BLOG"
  | "NEWS"
  | "ENTRECHAT"
  | "EVENT"
  | "PRESS"
  | "SUCCESS_STORY"
  | "RESOURCE";

// ─────────────────────────────────────────────────────────────
// CACHE (unchanged)
// ─────────────────────────────────────────────────────────────
type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
  cachedAt: number;
};

const metaCache = new Map<string, MetaEntry>();
const META_TTL = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

function getMetaFromCache(key: string): MetaEntry | null {
  const entry = metaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > META_TTL) {
    metaCache.delete(key);
    return null;
  }
  return entry;
}

function setMetaInCache(key: string, entry: MetaEntry) {
  if (metaCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = metaCache.keys().next().value;
    metaCache.delete(oldestKey!);
  }
  metaCache.set(key, entry);
}

async function fetchMeta(contentType: ContentType): Promise<MetaEntry> {
  const [categories, distinctReadingTimes] = await Promise.all([
    db
      .select({
        id: CategoriesTable.id,
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

    db
      .selectDistinct({ readingTime: ContentTable.readingTime })
      .from(ContentTable)
      .where(
        and(
          eq(ContentTable.contentType, contentType),
          eq(ContentTable.status, "PUBLISHED"),
          sql`${ContentTable.readingTime} IS NOT NULL`,
        ),
      ),
  ]);

  const readingTimes = Array.from(
    new Set(
      distinctReadingTimes
        .map((r) => r.readingTime!)
        .map((t) =>
          t <= 5 ? "Under 5 min" : t <= 10 ? "5–10 min" : "10+ min",
        ),
    ),
  );

  const entry: MetaEntry = {
    categories,
    readingTimes,
    cachedAt: Date.now(),
  };

  setMetaInCache(contentType, entry);
  return entry;
}

// ─────────────────────────────────────────────────────────────
// HEADERS
// ─────────────────────────────────────────────────────────────
const CONTENT_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};
const META_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
};
// const SUGGESTIONS_HEADERS = {
//   "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
// };

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);

    const contentType = (searchParams.get("contentType") ??
      "BLOG") as ContentType;

    // ───────────────── META
    if (searchParams.get("meta") === "1") {
      const cached = getMetaFromCache(contentType);
      const meta = cached ?? (await fetchMeta(contentType));

      return NextResponse.json(
        {
          categories: meta.categories,
          readingTimes: meta.readingTimes,
        },
        { headers: META_HEADERS },
      );
    }

    // ───────────────── PAGINATION
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "12"));
    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() ?? "";
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const categorySlugs = categoryParam
      ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const tagSlug = searchParams.get("tag")?.trim() ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";

    // ───────────────── WHERE CONDITIONS
    const conditions: SQL<unknown>[] = [
      eq(ContentTable.contentType, contentType),
      eq(ContentTable.status, "PUBLISHED"),
    ];

    if (search) {
      conditions.push(ilike(ContentTable.title, `%${search}%`));
    }

    if (dateFrom) {
      conditions.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      conditions.push(lte(ContentTable.publishedAt, to));
    }

    // ✅ CATEGORY FILTER (EXISTS → no join needed in count)
    if (categorySlugs.length > 0) {
      conditions.push(sql`
        EXISTS (
          SELECT 1 FROM ${CategoriesTable}
          WHERE ${CategoriesTable.id} = ${ContentTable.categoryId}
          AND ${inArray(CategoriesTable.slug, categorySlugs)}
        )
      `);
    }

    // ✅ TAG FILTER (already optimized)
    if (tagSlug) {
      conditions.push(sql`
        EXISTS (
          SELECT 1
          FROM ${ContentTagsTable}
          INNER JOIN ${TagsTable}
            ON ${ContentTagsTable.tagId} = ${TagsTable.id}
          WHERE ${ContentTagsTable.contentId} = ${ContentTable.id}
          AND ${TagsTable.slug} = ${tagSlug}
        )
      `);
    }

    const where = and(...conditions);

    // ───────────────── MAIN QUERY (JOIN needed)
    const mainQuery = db
      .select({
        id: ContentTable.id,
        title: ContentTable.title,
        slug: ContentTable.slug,
        summary: ContentTable.summary,
        featuredImage: ContentTable.featuredImage,
        externalUrl: ContentTable.externalUrl,
        readingTime: ContentTable.readingTime,
        publishedAt: ContentTable.publishedAt,
        authorName: ContentTable.authorName,
        categoryName: CategoriesTable.name,
        categorySlug: CategoriesTable.slug,
      })
      .from(ContentTable)
      .leftJoin(
        CategoriesTable,
        eq(ContentTable.categoryId, CategoriesTable.id),
      )
      .where(where)
      .orderBy(desc(ContentTable.publishedAt))
      .limit(limit)
      .offset(offset);

    // 🚀 OPTIMIZED COUNT (NO JOIN)
    const countQuery = db
      .select({ total: count() })
      .from(ContentTable)
      .where(where);

    // ───────────────── PARALLEL EXECUTION
    const cachedMeta = getMetaFromCache(contentType);

    const [rows, [{ total }], meta] = await Promise.all([
      mainQuery,
      countQuery,
      cachedMeta ? Promise.resolve(cachedMeta) : fetchMeta(contentType),
    ]);

    // ───────────────── TAG FETCH (batched)
    const tagMap: Record<string, any[]> = {};

    if (rows.length > 0) {
      const contentIds = rows.map((r) => r.id);

      const tagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          id: TagsTable.id,
          name: TagsTable.name,
          slug: TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(inArray(ContentTagsTable.contentId, contentIds));

      for (const t of tagRows) {
        if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
        tagMap[t.contentId].push(t);
      }
    }

    const totalItems = Number(total);

    return NextResponse.json(
      {
        items: rows.map((r) => ({
          ...r,
          tags: tagMap[r.id] ?? [],
        })),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasMore: offset + rows.length < totalItems,
        page,
        limit,
        categories: meta.categories,
        readingTimes: meta.readingTimes,
        performance: {
          responseTime: Date.now() - startTime,
        },
      },
      { headers: CONTENT_HEADERS },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 },
    );
  }
}