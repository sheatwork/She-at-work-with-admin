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
  and,
  eq,
  ilike,
  or,
  gte,
  lte,
  desc,
  inArray,
  sql,
  count,
  SQL,
} from "drizzle-orm";

// ── Uncomment and set to your DB region for best performance ──────────────────
// export const preferredRegion = "bom1"; // Mumbai — use if DB is on Neon/Supabase India

type ContentType =
  | "BLOG"
  | "NEWS"
  | "ENTRECHAT"
  | "EVENT"
  | "PRESS"
  | "SUCCESS_STORY"
  | "RESOURCE";

// ── In-memory meta cache with size limits ──────────────────────────────────
type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
  cachedAt: number;
};
const metaCache = new Map<string, MetaEntry>();
const META_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 50; // Prevent memory bloat

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
  // Enforce cache size limit
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

  const entry: MetaEntry = { categories, readingTimes, cachedAt: Date.now() };
  setMetaInCache(contentType, entry);
  return entry;
}

// ── Cache headers ─────────────────────────────────────────────────────────────
const CONTENT_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};
const META_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
};
const SUGGESTIONS_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};

// ── Rate limiting cache ────────────────────────────────────────────────────
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 60; // 60 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `rate_limit:${ip}`;

  const entry = rateLimitCache.get(key);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    // Reset counter for new window
    rateLimitCache.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false; // Rate limit exceeded
  }

  // Increment counter
  entry.count++;
  return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);

  console.log(`[${requestId}] 🚀 Request started: ${req.url}`);
  console.log(
    `[${requestId}] 📍 IP: ${req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"}`,
  );

  try {
    // ── Rate limiting ────────────────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rateLimitStart = Date.now();

    if (!checkRateLimit(ip)) {
      console.log(`[${requestId}] 🚫 Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    console.log(
      `[${requestId}] ✅ Rate limit check: ${Date.now() - rateLimitStart}ms`,
    );
    const { searchParams } = new URL(req.url);
    const contentType = (searchParams.get("contentType") ??
      "BLOG") as ContentType;

    // ── Meta endpoint ─────────────────────────────────────────────────────────
    if (searchParams.get("meta") === "1") {
      const meta =
        getMetaFromCache(contentType) ?? (await fetchMeta(contentType));
      return NextResponse.json(
        { categories: meta.categories, readingTimes: meta.readingTimes },
        { headers: META_HEADERS },
      );
    }

    // ── Suggestions endpoint ──────────────────────────────────────────────────
    if (searchParams.get("suggestions") === "1") {
      const q = searchParams.get("q")?.trim() ?? "";
      if (q.length < 2)
        return NextResponse.json(
          { results: [] },
          { headers: SUGGESTIONS_HEADERS },
        );

      const rows = await db
        .select({
          id: ContentTable.id,
          title: ContentTable.title,
          slug: ContentTable.slug,
          publishedAt: ContentTable.publishedAt,
          authorName: ContentTable.authorName,
          categoryName: CategoriesTable.name,
        })
        .from(ContentTable)
        .leftJoin(
          CategoriesTable,
          eq(ContentTable.categoryId, CategoriesTable.id),
        )
        .where(
          and(
            eq(ContentTable.contentType, contentType),
            eq(ContentTable.status, "PUBLISHED"),
            or(
              ilike(ContentTable.title, `%${q}%`),
              ilike(ContentTable.authorName, `%${q}%`),
            ),
          ),
        )
        .orderBy(desc(ContentTable.publishedAt))
        .limit(50);

      return NextResponse.json(
        { results: rows },
        { headers: SUGGESTIONS_HEADERS },
      );
    }

    // ── Main content listing ──────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "12"));
    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() ?? "";
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const categorySlugs = categoryParam
      ? categoryParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const tagSlug = searchParams.get("tag")?.trim() ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";

    // ── Build WHERE conditions ────────────────────────────────────────────────
    // ── Build WHERE conditions ────────────────────────────────────────────────
    // ── Build WHERE conditions ────────────────────────────────────────────────
    const conditions: SQL<unknown>[] = [
      eq(ContentTable.contentType, contentType),
      eq(ContentTable.status, "PUBLISHED"),
    ];

    if (search) conditions.push(ilike(ContentTable.title, `%${search}%`));
    if (dateFrom)
      conditions.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      conditions.push(lte(ContentTable.publishedAt, to));
    }

    // Category filter — use JOIN instead of separate query
    if (categorySlugs.length > 0) {
      const categoryCondition = and(
        inArray(
          CategoriesTable.slug,
          categorySlugs.filter((s) => s) as [string, ...string[]],
        ),
        eq(CategoriesTable.contentType, contentType),
        eq(CategoriesTable.isActive, true),
      );
      // Only push if the condition is valid (not undefined)
      if (categoryCondition) {
        conditions.push(categoryCondition);
      }
    }

    // Tag filter — use JOIN instead of separate query
    if (tagSlug) {
      const tagCondition = and(
        eq(TagsTable.slug, tagSlug as string),
        eq(ContentTagsTable.tagId, TagsTable.id),
        eq(ContentTagsTable.contentId, ContentTable.id),
      );
      // Only push if the condition is valid (not undefined)
      if (tagCondition) {
        conditions.push(tagCondition);
      }
    }

    // Create the where clause
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // ── Optimized single query with proper JOINs ──────────────────────────────
    const dbQueryStart = Date.now();
    let query = db
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
        categoryId: ContentTable.categoryId,
        categoryName: CategoriesTable.name,
        categorySlug: CategoriesTable.slug,
      })
      .from(ContentTable)
      .leftJoin(
        CategoriesTable,
        eq(ContentTable.categoryId, CategoriesTable.id),
      );

    // Add tag joins only if tag filter is present
    if (tagSlug) {
      query = query
        .innerJoin(
          ContentTagsTable,
          eq(ContentTable.id, ContentTagsTable.contentId),
        )
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id));
    }

    const rows = await query
      .where(where)
      .orderBy(desc(ContentTable.publishedAt))
      .limit(limit)
      .offset(offset);

    console.log(
      `[${requestId}] 🗃️ Main query executed: ${Date.now() - dbQueryStart}ms, returned ${rows.length} rows`,
    );

    // ── Count query (optimized) ──────────────────────────────────────────────
    const countStart = Date.now();
    let countQuery = db
      .select({ total: count() })
      .from(ContentTable)
      .leftJoin(
        CategoriesTable,
        eq(ContentTable.categoryId, CategoriesTable.id),
      );

    if (tagSlug) {
      countQuery = countQuery
        .innerJoin(
          ContentTagsTable,
          eq(ContentTable.id, ContentTagsTable.contentId),
        )
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id));
    }

    const [{ total }] = await countQuery.where(where);
    console.log(
      `[${requestId}] 📊 Count query executed: ${Date.now() - countStart}ms, total: ${total}`,
    );

    // ── Meta (cached) ────────────────────────────────────────────────────────
    const metaStart = Date.now();
    const meta =
      getMetaFromCache(contentType) ?? (await fetchMeta(contentType));
    const metaSource = getMetaFromCache(contentType) ? "cache" : "database";
    console.log(
      `[${requestId}] 📚 Meta loaded from ${metaSource}: ${Date.now() - metaStart}ms`,
    );

    // ── Tags for this page (optimized with single query) ────────────────────
    const tagsStart = Date.now();
    const tagMap: Record<string, { id: string; name: string; slug: string }[]> =
      {};

    if (rows.length > 0) {
      const contentIds = rows.map((r) => r.id);
      const tagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          tagId: TagsTable.id,
          tagName: TagsTable.name,
          tagSlug: TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(inArray(ContentTagsTable.contentId, contentIds));

      for (const t of tagRows) {
        if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
        tagMap[t.contentId].push({
          id: t.tagId,
          name: t.tagName,
          slug: t.tagSlug,
        });
      }
      console.log(
        `[${requestId}] 🏷️ Tags loaded: ${Date.now() - tagsStart}ms, ${tagRows.length} tags for ${rows.length} items`,
      );
    } else {
      console.log(`[${requestId}] 🏷️ No tags needed (no rows)`);
    }

    const totalItems = Number(total);

    const suggestionCandidates = search
      ? rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          publishedAt: r.publishedAt,
          authorName: r.authorName,
          categoryName: r.categoryName,
        }))
      : [];

    const responseTime = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Request completed: ${responseTime}ms total`);
    console.log(
      `[${requestId}] 📦 Response: ${rows.length} items, ${totalItems} total, page ${page}/${Math.ceil(totalItems / limit)}`,
    );
    console.log(`[${requestId}] ———————————————————————————————————————`);

    return NextResponse.json(
      {
        items: rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasMore: offset + rows.length < totalItems,
        page,
        limit,
        categories: meta.categories,
        readingTimes: meta.readingTimes,
        suggestionCandidates,
        // Performance metrics for monitoring
        _performance: {
          requestId,
          responseTime,
          dbQueryTime: Date.now() - dbQueryStart,
          countQueryTime: Date.now() - countStart,
          metaLoadTime: Date.now() - metaStart,
          tagsLoadTime: rows.length > 0 ? Date.now() - tagsStart : 0,
        },
      },
      { headers: CONTENT_HEADERS },
    );
  } catch (err) {
    console.error(`[${requestId}] ❌ ERROR:`, err);
    console.log(`[${requestId}] ———————————————————————————————————————`);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 },
    );
  }
}
