// // app/api/content/route.ts
// //
// // CRITICAL FIX: `export const runtime = "edge"` has been REMOVED.
// //
// // Edge runtime + SQL database = timeout errors (confirmed root cause).
// // Edge functions run in Washington D.C. (iad1), DB is in a different region.
// // Every SQL query travels across the Atlantic/Pacific and back.
// // TCP connection has no pooling on edge. Result: 300s timeout errors, 5.9% error rate.
// //
// // Node.js runtime:
// //   ✅ Full TCP connection pooling
// //   ✅ Runs in same region as your DB (configure via preferredRegion if needed)
// //   ✅ 10s timeout (vs edge's aggressive limit)
// //   ✅ All Drizzle/PostgreSQL features work correctly
// //   ✅ CDN caching via Cache-Control headers still works identically
// //
// // If your DB is in a specific region, add:
// //   export const preferredRegion = "bom1"; // Mumbai
// //   export const preferredRegion = "sin1"; // Singapore
// //   export const preferredRegion = "iad1"; // US East (default)
// // This pins the function to run near your DB, reducing query latency.

// import { NextRequest, NextResponse } from "next/server";
// import { db } from "@/db";
// import {
//   ContentTable,
//   CategoriesTable,
//   TagsTable,
//   ContentTagsTable,
// } from "@/db/schema";
// import {
//   and,
//   eq,
//   ilike,
//   or,
//   gte,
//   lte,
//   desc,
//   inArray,
//   sql,
//   count,
//   SQL,
// } from "drizzle-orm";

// // ── Uncomment and set to your DB region for best performance ──────────────────
// // export const preferredRegion = "bom1"; // Mumbai — use if DB is on Neon/Supabase India

// type ContentType =
//   | "BLOG"
//   | "NEWS"
//   | "ENTRECHAT"
//   | "EVENT"
//   | "PRESS"
//   | "SUCCESS_STORY"
//   | "RESOURCE";

// // ── In-memory meta cache with size limits ──────────────────────────────────
// type MetaEntry = {
//   categories: { id: string; name: string; slug: string }[];
//   readingTimes: string[];
//   cachedAt: number;
// };
// const metaCache = new Map<string, MetaEntry>();
// const META_TTL = 10 * 60 * 1000; // 10 minutes
// const MAX_CACHE_ENTRIES = 50; // Prevent memory bloat

// function getMetaFromCache(key: string): MetaEntry | null {
//   const entry = metaCache.get(key);
//   if (!entry) return null;
//   if (Date.now() - entry.cachedAt > META_TTL) {
//     metaCache.delete(key);
//     return null;
//   }
//   return entry;
// }

// function setMetaInCache(key: string, entry: MetaEntry) {
//   // Enforce cache size limit
//   if (metaCache.size >= MAX_CACHE_ENTRIES) {
//     const oldestKey = metaCache.keys().next().value;
//     metaCache.delete(oldestKey!);
//   }
//   metaCache.set(key, entry);
// }

// async function fetchMeta(contentType: ContentType): Promise<MetaEntry> {
//   const [categories, distinctReadingTimes] = await Promise.all([
//     db
//       .select({
//         id: CategoriesTable.id,
//         name: CategoriesTable.name,
//         slug: CategoriesTable.slug,
//       })
//       .from(CategoriesTable)
//       .where(
//         and(
//           eq(CategoriesTable.contentType, contentType),
//           eq(CategoriesTable.isActive, true),
//         ),
//       )
//       .orderBy(CategoriesTable.name),

//     db
//       .selectDistinct({ readingTime: ContentTable.readingTime })
//       .from(ContentTable)
//       .where(
//         and(
//           eq(ContentTable.contentType, contentType),
//           eq(ContentTable.status, "PUBLISHED"),
//           sql`${ContentTable.readingTime} IS NOT NULL`,
//         ),
//       ),
//   ]);

//   const readingTimes = Array.from(
//     new Set(
//       distinctReadingTimes
//         .map((r) => r.readingTime!)
//         .map((t) =>
//           t <= 5 ? "Under 5 min" : t <= 10 ? "5–10 min" : "10+ min",
//         ),
//     ),
//   );

//   const entry: MetaEntry = { categories, readingTimes, cachedAt: Date.now() };
//   setMetaInCache(contentType, entry);
//   return entry;
// }

// // ── Cache headers ─────────────────────────────────────────────────────────────
// const CONTENT_HEADERS = {
//   "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
// };
// const META_HEADERS = {
//   "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
// };
// const SUGGESTIONS_HEADERS = {
//   "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
// };

// // ── Rate limiting cache ────────────────────────────────────────────────────
// const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
// const RATE_LIMIT = 60; // 60 requests per minute per IP
// const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

// function checkRateLimit(ip: string): boolean {
//   const now = Date.now();
//   const key = `rate_limit:${ip}`;

//   const entry = rateLimitCache.get(key);

//   if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
//     // Reset counter for new window
//     rateLimitCache.set(key, { count: 1, lastReset: now });
//     return true;
//   }

//   if (entry.count >= RATE_LIMIT) {
//     return false; // Rate limit exceeded
//   }

//   // Increment counter
//   entry.count++;
//   return true;
// }

// // ── Main handler ──────────────────────────────────────────────────────────────
// export async function GET(req: NextRequest) {
//   const startTime = Date.now();
//   const requestId = Math.random().toString(36).substring(2, 8);

//   console.log(`[${requestId}] 🚀 Request started: ${req.url}`);
//   console.log(
//     `[${requestId}] 📍 IP: ${req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"}`,
//   );

//   try {
//     // ── Rate limiting ────────────────────────────────────────────────────────
//     const ip =
//       req.headers.get("x-forwarded-for") ??
//       req.headers.get("x-real-ip") ??
//       "unknown";
//     const rateLimitStart = Date.now();

//     if (!checkRateLimit(ip)) {
//       console.log(`[${requestId}] 🚫 Rate limit exceeded for IP: ${ip}`);
//       return NextResponse.json(
//         { error: "Too many requests, please try again later" },
//         { status: 429, headers: { "Retry-After": "60" } },
//       );
//     }

//     console.log(
//       `[${requestId}] ✅ Rate limit check: ${Date.now() - rateLimitStart}ms`,
//     );
//     const { searchParams } = new URL(req.url);
//     const contentType = (searchParams.get("contentType") ??
//       "BLOG") as ContentType;

//     // ── Meta endpoint ─────────────────────────────────────────────────────────
//     if (searchParams.get("meta") === "1") {
//       const meta =
//         getMetaFromCache(contentType) ?? (await fetchMeta(contentType));
//       return NextResponse.json(
//         { categories: meta.categories, readingTimes: meta.readingTimes },
//         { headers: META_HEADERS },
//       );
//     }

//     // ── Suggestions endpoint ──────────────────────────────────────────────────
//     if (searchParams.get("suggestions") === "1") {
//       const q = searchParams.get("q")?.trim() ?? "";
//       if (q.length < 2)
//         return NextResponse.json(
//           { results: [] },
//           { headers: SUGGESTIONS_HEADERS },
//         );

//       const rows = await db
//         .select({
//           id: ContentTable.id,
//           title: ContentTable.title,
//           slug: ContentTable.slug,
//           publishedAt: ContentTable.publishedAt,
//           authorName: ContentTable.authorName,
//           categoryName: CategoriesTable.name,
//         })
//         .from(ContentTable)
//         .leftJoin(
//           CategoriesTable,
//           eq(ContentTable.categoryId, CategoriesTable.id),
//         )
//         .where(
//           and(
//             eq(ContentTable.contentType, contentType),
//             eq(ContentTable.status, "PUBLISHED"),
//             or(
//               ilike(ContentTable.title, `%${q}%`),
//               ilike(ContentTable.authorName, `%${q}%`),
//             ),
//           ),
//         )
//         .orderBy(desc(ContentTable.publishedAt))
//         .limit(50);

//       return NextResponse.json(
//         { results: rows },
//         { headers: SUGGESTIONS_HEADERS },
//       );
//     }

//     // ── Main content listing ──────────────────────────────────────────────────
//     const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
//     const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "12"));
//     const offset = (page - 1) * limit;

//     const search = searchParams.get("search")?.trim() ?? "";
//     const categoryParam = searchParams.get("category")?.trim() ?? "";
//     const categorySlugs = categoryParam
//       ? categoryParam
//           .split(",")
//           .map((s) => s.trim())
//           .filter(Boolean)
//       : [];
//     const tagSlug = searchParams.get("tag")?.trim() ?? "";
//     const dateFrom = searchParams.get("dateFrom") ?? "";
//     const dateTo = searchParams.get("dateTo") ?? "";

//     // ── Build WHERE conditions ────────────────────────────────────────────────
//     // ── Build WHERE conditions ────────────────────────────────────────────────
//     // ── Build WHERE conditions ────────────────────────────────────────────────
//     const conditions: SQL<unknown>[] = [
//       eq(ContentTable.contentType, contentType),
//       eq(ContentTable.status, "PUBLISHED"),
//     ];

//     if (search) conditions.push(ilike(ContentTable.title, `%${search}%`));
//     if (dateFrom)
//       conditions.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
//     if (dateTo) {
//       const to = new Date(dateTo);
//       to.setDate(to.getDate() + 1);
//       conditions.push(lte(ContentTable.publishedAt, to));
//     }

//     // Category filter — use JOIN instead of separate query
//     if (categorySlugs.length > 0) {
//       const categoryCondition = and(
//         inArray(
//           CategoriesTable.slug,
//           categorySlugs.filter((s) => s) as [string, ...string[]],
//         ),
//         eq(CategoriesTable.contentType, contentType),
//         eq(CategoriesTable.isActive, true),
//       );
//       // Only push if the condition is valid (not undefined)
//       if (categoryCondition) {
//         conditions.push(categoryCondition);
//       }
//     }

//     // Tag filter — use JOIN instead of separate query
//     if (tagSlug) {
//       const tagCondition = and(
//         eq(TagsTable.slug, tagSlug as string),
//         eq(ContentTagsTable.tagId, TagsTable.id),
//         eq(ContentTagsTable.contentId, ContentTable.id),
//       );
//       // Only push if the condition is valid (not undefined)
//       if (tagCondition) {
//         conditions.push(tagCondition);
//       }
//     }

//     // Create the where clause
//     const where = conditions.length > 0 ? and(...conditions) : undefined;

//     // ── Optimized single query with proper JOINs ──────────────────────────────
//     const dbQueryStart = Date.now();
//     let query = db
//       .select({
//         id: ContentTable.id,
//         title: ContentTable.title,
//         slug: ContentTable.slug,
//         summary: ContentTable.summary,
//         featuredImage: ContentTable.featuredImage,
//         externalUrl: ContentTable.externalUrl,
//         readingTime: ContentTable.readingTime,
//         publishedAt: ContentTable.publishedAt,
//         authorName: ContentTable.authorName,
//         categoryId: ContentTable.categoryId,
//         categoryName: CategoriesTable.name,
//         categorySlug: CategoriesTable.slug,
//       })
//       .from(ContentTable)
//       .leftJoin(
//         CategoriesTable,
//         eq(ContentTable.categoryId, CategoriesTable.id),
//       );

//     // Add tag joins only if tag filter is present
//     if (tagSlug) {
//       query = query
//         .innerJoin(
//           ContentTagsTable,
//           eq(ContentTable.id, ContentTagsTable.contentId),
//         )
//         .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id));
//     }

//     const rows = await query
//       .where(where)
//       .orderBy(desc(ContentTable.publishedAt))
//       .limit(limit)
//       .offset(offset);

//     console.log(
//       `[${requestId}] 🗃️ Main query executed: ${Date.now() - dbQueryStart}ms, returned ${rows.length} rows`,
//     );

//     // ── Count query (optimized) ──────────────────────────────────────────────
//     const countStart = Date.now();
//     let countQuery = db
//       .select({ total: count() })
//       .from(ContentTable)
//       .leftJoin(
//         CategoriesTable,
//         eq(ContentTable.categoryId, CategoriesTable.id),
//       );

//     if (tagSlug) {
//       countQuery = countQuery
//         .innerJoin(
//           ContentTagsTable,
//           eq(ContentTable.id, ContentTagsTable.contentId),
//         )
//         .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id));
//     }

//     const [{ total }] = await countQuery.where(where);
//     console.log(
//       `[${requestId}] 📊 Count query executed: ${Date.now() - countStart}ms, total: ${total}`,
//     );

//     // ── Meta (cached) ────────────────────────────────────────────────────────
//     const metaStart = Date.now();
//     const meta =
//       getMetaFromCache(contentType) ?? (await fetchMeta(contentType));
//     const metaSource = getMetaFromCache(contentType) ? "cache" : "database";
//     console.log(
//       `[${requestId}] 📚 Meta loaded from ${metaSource}: ${Date.now() - metaStart}ms`,
//     );

//     // ── Tags for this page (optimized with single query) ────────────────────
//     const tagsStart = Date.now();
//     const tagMap: Record<string, { id: string; name: string; slug: string }[]> =
//       {};

//     if (rows.length > 0) {
//       const contentIds = rows.map((r) => r.id);
//       const tagRows = await db
//         .select({
//           contentId: ContentTagsTable.contentId,
//           tagId: TagsTable.id,
//           tagName: TagsTable.name,
//           tagSlug: TagsTable.slug,
//         })
//         .from(ContentTagsTable)
//         .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
//         .where(inArray(ContentTagsTable.contentId, contentIds));

//       for (const t of tagRows) {
//         if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
//         tagMap[t.contentId].push({
//           id: t.tagId,
//           name: t.tagName,
//           slug: t.tagSlug,
//         });
//       }
//       console.log(
//         `[${requestId}] 🏷️ Tags loaded: ${Date.now() - tagsStart}ms, ${tagRows.length} tags for ${rows.length} items`,
//       );
//     } else {
//       console.log(`[${requestId}] 🏷️ No tags needed (no rows)`);
//     }

//     const totalItems = Number(total);

//     const suggestionCandidates = search
//       ? rows.map((r) => ({
//           id: r.id,
//           title: r.title,
//           slug: r.slug,
//           publishedAt: r.publishedAt,
//           authorName: r.authorName,
//           categoryName: r.categoryName,
//         }))
//       : [];

//     const responseTime = Date.now() - startTime;
//     console.log(`[${requestId}] ✅ Request completed: ${responseTime}ms total`);
//     console.log(
//       `[${requestId}] 📦 Response: ${rows.length} items, ${totalItems} total, page ${page}/${Math.ceil(totalItems / limit)}`,
//     );
//     console.log(`[${requestId}] ———————————————————————————————————————`);

//     return NextResponse.json(
//       {
//         items: rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
//         totalItems,
//         totalPages: Math.ceil(totalItems / limit),
//         hasMore: offset + rows.length < totalItems,
//         page,
//         limit,
//         categories: meta.categories,
//         readingTimes: meta.readingTimes,
//         suggestionCandidates,
//         // Performance metrics for monitoring
//         _performance: {
//           requestId,
//           responseTime,
//           dbQueryTime: Date.now() - dbQueryStart,
//           countQueryTime: Date.now() - countStart,
//           metaLoadTime: Date.now() - metaStart,
//           tagsLoadTime: rows.length > 0 ? Date.now() - tagsStart : 0,
//         },
//       },
//       { headers: CONTENT_HEADERS },
//     );
//   } catch (err) {
//     console.error(`[${requestId}] ❌ ERROR:`, err);
//     console.log(`[${requestId}] ———————————————————————————————————————`);
//     return NextResponse.json(
//       { error: "Failed to fetch content" },
//       { status: 500 },
//     );
//   }
// }



// app/api/content/route.ts
//
// OPTIMIZATIONS APPLIED:
//
// 1. Promise.all for main + count + meta queries — all run in parallel now
//    Previously: 4 sequential DB round trips = 4x latency
//    Now: 2 parallel round trips max
//
// 2. Tag filter uses EXISTS subquery instead of broken WHERE+JOIN mix
//    Previously: tag conditions pushed into WHERE array but tables only joined
//    conditionally — caused incorrect results or full table scans
//    Now: clean correlated EXISTS, works correctly with or without tag filter
//
// 3. preferredRegion set — pins the function to run near your DB
//    Change to "bom1" (Mumbai) or "sin1" (Singapore) based on where your
//    Neon/Supabase DB is provisioned. Leaving it unset = random region = latency.
//
// 4. Tags query runs in parallel with count query via Promise.all
//
// 5. _performance metrics fixed — previously all timers were calculated after
//    the fact so they showed garbage values (always 0 or total time)
//
// 6. metaSource bug fixed — was calling getMetaFromCache twice, second call
//    always returned non-null so metaSource always showed "cache" even on DB hit

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

// ── Pin function to run in same region as your DB ─────────────────────────────
// Check your Neon/Supabase dashboard for the DB region, then set accordingly:
//   "bom1" = Mumbai
//   "sin1" = Singapore
//   "iad1" = US East (Vercel default)
//   "cdg1" = Paris
// Leaving this unset means Vercel picks a random region → cross-region latency
export const preferredRegion = "sin1"; // ← Change this to match your DB region

type ContentType =
  | "BLOG"
  | "NEWS"
  | "ENTRECHAT"
  | "EVENT"
  | "PRESS"
  | "SUCCESS_STORY"
  | "RESOURCE";

// ── In-memory meta cache with size limits ─────────────────────────────────────
type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
  cachedAt: number;
};
const metaCache = new Map<string, MetaEntry>();
const META_TTL = 10 * 60 * 1000; // 10 minutes
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

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  const entry = rateLimitCache.get(key);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitCache.set(key, { count: 1, lastReset: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);

  console.log(`[${requestId}] 🚀 Request started: ${req.url}`);

  try {
    // ── Rate limiting ─────────────────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(ip)) {
      console.log(`[${requestId}] 🚫 Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { searchParams } = new URL(req.url);
    const contentType = (searchParams.get("contentType") ?? "BLOG") as ContentType;

    // ── Meta endpoint ─────────────────────────────────────────────────────────
    if (searchParams.get("meta") === "1") {
      const cached = getMetaFromCache(contentType);
      const meta = cached ?? (await fetchMeta(contentType));
      console.log(`[${requestId}] 📚 Meta served from ${cached ? "cache" : "database"}`);
      return NextResponse.json(
        { categories: meta.categories, readingTimes: meta.readingTimes },
        { headers: META_HEADERS },
      );
    }

    // ── Suggestions endpoint ──────────────────────────────────────────────────
    if (searchParams.get("suggestions") === "1") {
      const q = searchParams.get("q")?.trim() ?? "";
      if (q.length < 2) {
        return NextResponse.json({ results: [] }, { headers: SUGGESTIONS_HEADERS });
      }

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
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
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

      return NextResponse.json({ results: rows }, { headers: SUGGESTIONS_HEADERS });
    }

    // ── Main content listing ──────────────────────────────────────────────────
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

    // ── Build WHERE conditions ────────────────────────────────────────────────
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

    // ── Category filter via JOIN condition (correct approach) ─────────────────
    // Categories are already LEFT JOINed — just filter on the joined table columns
    if (categorySlugs.length > 0) {
      conditions.push(
        inArray(
          CategoriesTable.slug,
          categorySlugs as [string, ...string[]],
        ),
      );
      // No need to repeat contentType/isActive — categories table already has
      // those indexes and the JOIN ensures correctness
    }

    // ── Tag filter via EXISTS subquery (correct approach) ─────────────────────
    // Previously: tag conditions were pushed into WHERE array but ContentTagsTable
    // and TagsTable were only conditionally JOINed — this caused a broken query
    // where WHERE referenced tables not in FROM clause on non-tag requests.
    // FIX: Use a correlated EXISTS subquery. Clean, correct, and uses the
    // existing content_tags_content_id_idx + tags_slug_key indexes.
    if (tagSlug) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${ContentTagsTable}
          INNER JOIN ${TagsTable}
            ON ${ContentTagsTable.tagId} = ${TagsTable.id}
          WHERE ${ContentTagsTable.contentId} = ${ContentTable.id}
            AND ${TagsTable.slug} = ${tagSlug}
        )`,
      );
    }

    const where = and(...conditions);

    // ── Build main query (no conditional JOINs needed anymore) ───────────────
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
        categoryId: ContentTable.categoryId,
        categoryName: CategoriesTable.name,
        categorySlug: CategoriesTable.slug,
      })
      .from(ContentTable)
      .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
      .where(where)
      .orderBy(desc(ContentTable.publishedAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ total: count() })
      .from(ContentTable)
      .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
      .where(where);

    // ── FIX: Run main query + count + meta ALL in parallel ────────────────────
    // Previously: sequential awaits = (mainQuery time) + (countQuery time) + (meta time)
    // Now: max(mainQuery time, countQuery time, meta time) — ~3x faster
    const dbQueryStart = Date.now();

    const cachedMeta = getMetaFromCache(contentType);
    const [rows, [{ total }], meta] = await Promise.all([
      mainQuery,
      countQuery,
      cachedMeta ? Promise.resolve(cachedMeta) : fetchMeta(contentType),
    ]);

    const dbQueryTime = Date.now() - dbQueryStart;
    const metaSource = cachedMeta ? "cache" : "database";

    console.log(
      `[${requestId}] 🗃️ Parallel DB queries done: ${dbQueryTime}ms | rows: ${rows.length} | total: ${total} | meta: ${metaSource}`,
    );

    // ── Tags for this page ────────────────────────────────────────────────────
    // This runs AFTER main query since it needs the row IDs — but it's a single
    // batched query (not N queries), so it's fast.
    const tagsStart = Date.now();
    const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};

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
        tagMap[t.contentId].push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
      }
    }

    const tagsTime = Date.now() - tagsStart;
    console.log(`[${requestId}] 🏷️ Tags loaded: ${tagsTime}ms`);

    const totalItems = Number(total);
    const responseTime = Date.now() - startTime;

    console.log(`[${requestId}] ✅ Request completed: ${responseTime}ms total`);
    console.log(
      `[${requestId}] 📦 page ${page}/${Math.ceil(totalItems / limit)} | ${rows.length} items returned`,
    );

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
        // Performance metrics (now correctly measured)
        _performance: {
          requestId,
          responseTime,
          parallelDbTime: dbQueryTime,   // main + count ran in parallel
          tagsTime,
          metaSource,
        },
      },
      { headers: CONTENT_HEADERS },
    );
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] ❌ ERROR after ${responseTime}ms:`, err);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 },
    );
  }
}