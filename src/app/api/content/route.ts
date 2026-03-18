// app/api/content/route.ts
//
// CRITICAL FIX: `export const runtime = "edge"` has been REMOVED.
//
// Edge runtime + SQL database = timeout errors (confirmed root cause).
// Edge functions run in Washington D.C. (iad1), DB is in a different region.
// Every SQL query travels across the Atlantic/Pacific and back.
// TCP connection has no pooling on edge. Result: 300s timeout errors, 5.9% error rate.
//
// Node.js runtime:
//   ✅ Full TCP connection pooling
//   ✅ Runs in same region as your DB (configure via preferredRegion if needed)
//   ✅ 10s timeout (vs edge's aggressive limit)
//   ✅ All Drizzle/PostgreSQL features work correctly
//   ✅ CDN caching via Cache-Control headers still works identically
//
// If your DB is in a specific region, add:
//   export const preferredRegion = "bom1"; // Mumbai
//   export const preferredRegion = "sin1"; // Singapore
//   export const preferredRegion = "iad1"; // US East (default)
// This pins the function to run near your DB, reducing query latency.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ContentTable,
  CategoriesTable,
  TagsTable,
  ContentTagsTable,
} from "@/db/schema";
import {
  and, eq, ilike, or, gte, lte, desc,
  inArray, sql, count,
} from "drizzle-orm";

// ── Uncomment and set to your DB region for best performance ──────────────────
// export const preferredRegion = "bom1"; // Mumbai — use if DB is on Neon/Supabase India

type ContentType =
  | "BLOG" | "NEWS" | "ENTRECHAT" | "EVENT"
  | "PRESS" | "SUCCESS_STORY" | "RESOURCE";

// ── In-memory meta cache (best-effort, warm instances only) ───────────────────
type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
  cachedAt: number;
};
const metaCache = new Map<string, MetaEntry>();
const META_TTL = 10 * 60 * 1000;

function getMetaFromCache(key: string): MetaEntry | null {
  const entry = metaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > META_TTL) { metaCache.delete(key); return null; }
  return entry;
}

async function fetchMeta(contentType: ContentType): Promise<MetaEntry> {
  const [categories, distinctReadingTimes] = await Promise.all([
    db
      .select({ id: CategoriesTable.id, name: CategoriesTable.name, slug: CategoriesTable.slug })
      .from(CategoriesTable)
      .where(and(
        eq(CategoriesTable.contentType, contentType),
        eq(CategoriesTable.isActive, true),
      ))
      .orderBy(CategoriesTable.name),

    db
      .selectDistinct({ readingTime: ContentTable.readingTime })
      .from(ContentTable)
      .where(and(
        eq(ContentTable.contentType, contentType),
        eq(ContentTable.status, "PUBLISHED"),
        sql`${ContentTable.readingTime} IS NOT NULL`,
      )),
  ]);

  const readingTimes = Array.from(new Set(
    distinctReadingTimes
      .map((r) => r.readingTime!)
      .map((t) => t <= 5 ? "Under 5 min" : t <= 10 ? "5–10 min" : "10+ min")
  ));

  const entry: MetaEntry = { categories, readingTimes, cachedAt: Date.now() };
  metaCache.set(contentType, entry);
  return entry;
}

// ── Cache headers ─────────────────────────────────────────────────────────────
const CONTENT_HEADERS     = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
const META_HEADERS        = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };
const SUGGESTIONS_HEADERS = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" };

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = (searchParams.get("contentType") ?? "BLOG") as ContentType;

    // ── Meta endpoint ─────────────────────────────────────────────────────────
    if (searchParams.get("meta") === "1") {
      const meta = getMetaFromCache(contentType) ?? await fetchMeta(contentType);
      return NextResponse.json(
        { categories: meta.categories, readingTimes: meta.readingTimes },
        { headers: META_HEADERS },
      );
    }

    // ── Suggestions endpoint ──────────────────────────────────────────────────
    if (searchParams.get("suggestions") === "1") {
      const q = searchParams.get("q")?.trim() ?? "";
      if (q.length < 2) return NextResponse.json({ results: [] }, { headers: SUGGESTIONS_HEADERS });

      const rows = await db
        .select({
          id: ContentTable.id, title: ContentTable.title, slug: ContentTable.slug,
          publishedAt: ContentTable.publishedAt, authorName: ContentTable.authorName,
          categoryName: CategoriesTable.name,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .where(and(
          eq(ContentTable.contentType, contentType),
          eq(ContentTable.status, "PUBLISHED"),
          or(ilike(ContentTable.title, `%${q}%`), ilike(ContentTable.authorName, `%${q}%`)),
        ))
        .orderBy(desc(ContentTable.publishedAt))
        .limit(50);

      return NextResponse.json({ results: rows }, { headers: SUGGESTIONS_HEADERS });
    }

    // ── Main content listing ──────────────────────────────────────────────────
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit  = Math.min(50, parseInt(searchParams.get("limit") ?? "12"));
    const offset = (page - 1) * limit;

    const search        = searchParams.get("search")?.trim()   ?? "";
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const categorySlugs = categoryParam
      ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const tagSlug  = searchParams.get("tag")?.trim()  ?? "";
    const dateFrom = searchParams.get("dateFrom")     ?? "";
    const dateTo   = searchParams.get("dateTo")       ?? "";

    // ── Build WHERE conditions ────────────────────────────────────────────────
    const conditions = [
      eq(ContentTable.contentType, contentType),
      eq(ContentTable.status, "PUBLISHED"),
    ];

    if (search)   conditions.push(ilike(ContentTable.title, `%${search}%`));
    if (dateFrom) conditions.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      conditions.push(lte(ContentTable.publishedAt, to));
    }

    // Category filter — resolve slugs to IDs first (avoids subquery)
    if (categorySlugs.length > 0) {
      const catRows = await db
        .select({ id: CategoriesTable.id })
        .from(CategoriesTable)
        .where(and(
          inArray(CategoriesTable.slug, categorySlugs),
          eq(CategoriesTable.contentType, contentType),
          eq(CategoriesTable.isActive, true),
        ));

      const categoryIds = catRows.map((r) => r.id);

      if (categoryIds.length === 0) {
        const meta = getMetaFromCache(contentType) ?? await fetchMeta(contentType);
        return NextResponse.json(
          { items: [], totalItems: 0, totalPages: 0, hasMore: false, page, limit,
            categories: meta.categories, readingTimes: meta.readingTimes,
            suggestionCandidates: [] },
          { headers: CONTENT_HEADERS },
        );
      }

      if (categoryIds.length === 1) {
        conditions.push(eq(ContentTable.categoryId, categoryIds[0]));
      } else {
        conditions.push(inArray(ContentTable.categoryId, categoryIds));
      }
    }

    // Tag filter — resolve tag slug to content IDs first (avoids subquery)
    if (tagSlug) {
      const tagContentIds = await db
        .select({ contentId: ContentTagsTable.contentId })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(eq(TagsTable.slug, tagSlug));

      const ids = tagContentIds.map((r) => r.contentId);

      if (ids.length === 0) {
        const meta = getMetaFromCache(contentType) ?? await fetchMeta(contentType);
        return NextResponse.json(
          { items: [], totalItems: 0, totalPages: 0, hasMore: false, page, limit,
            categories: meta.categories, readingTimes: meta.readingTimes,
            suggestionCandidates: [] },
          { headers: CONTENT_HEADERS },
        );
      }
      conditions.push(inArray(ContentTable.id, ids));
    }

    const where = and(...conditions);

    // ── Parallel: content rows + total count + meta ───────────────────────────
    // COUNT is kept here (removed from previous version but restored for
    // correct pagination UI). It runs in parallel with the main query so
    // it doesn't add sequential latency — both fire at the same time.
    const [rows, [{ total }], meta] = await Promise.all([
      db
        .select({
          id:            ContentTable.id,
          title:         ContentTable.title,
          slug:          ContentTable.slug,
          summary:       ContentTable.summary,
          featuredImage: ContentTable.featuredImage,
          externalUrl:   ContentTable.externalUrl,
          readingTime:   ContentTable.readingTime,
          publishedAt:   ContentTable.publishedAt,
          authorName:    ContentTable.authorName,
          categoryId:    ContentTable.categoryId,
          categoryName:  CategoriesTable.name,
          categorySlug:  CategoriesTable.slug,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .where(where)
        .orderBy(desc(ContentTable.publishedAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(ContentTable).where(where),

      getMetaFromCache(contentType)
        ? Promise.resolve(getMetaFromCache(contentType)!)
        : fetchMeta(contentType),
    ]);

    // ── Tags for this page ────────────────────────────────────────────────────
    const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};

    if (rows.length > 0) {
      const tagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          tagId:     TagsTable.id,
          tagName:   TagsTable.name,
          tagSlug:   TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(inArray(ContentTagsTable.contentId, rows.map((r) => r.id)));

      for (const t of tagRows) {
        if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
        tagMap[t.contentId].push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
      }
    }

    const totalItems = Number(total);

    const suggestionCandidates = search
      ? rows.map((r) => ({
          id: r.id, title: r.title, slug: r.slug,
          publishedAt: r.publishedAt, authorName: r.authorName,
          categoryName: r.categoryName,
        }))
      : [];

    return NextResponse.json(
      {
        items:               rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
        totalItems,
        totalPages:          Math.ceil(totalItems / limit),
        hasMore:             offset + rows.length < totalItems,
        page,
        limit,
        categories:          meta.categories,
        readingTimes:        meta.readingTimes,
        suggestionCandidates,
      },
      { headers: CONTENT_HEADERS },
    );

  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}