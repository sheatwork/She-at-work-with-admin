// app/api/content/route.ts
// ─────────────────────────────────────────────────────────────────────────
// Content API — used by client-side filtering + pagination
// ✅ Optimized: logging only in development
// ─────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { stableCache } from "@/lib/data-cache";
import { CACHE_TAGS } from "@/lib/revalidate";
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
  gte,
  lte,
  desc,
  inArray,
  sql,
  count,
  SQL,
} from "drizzle-orm";

// ✅ NEW: Conditional logging for production
const DEBUG = process.env.NODE_ENV === "development";

// Cached at the CDN via the Cache-Control headers below. (A route-segment
// `revalidate` export does nothing here: the handler reads the request, so the
// route is always dynamic.)
//
// Pinned next to the Neon compute (ap-southeast-1). Remove once the Vercel
// project's default function region is sin1.
export const preferredRegion = "sin1";
export const runtime = "nodejs";


// ... [rest of type definitions remain the same] ...

const CONTENT_TYPES = [
  "BLOG",
  "NEWS",
  "ENTRECHAT",
  "EVENT",
  "PRESS",
  "SUCCESS_STORY",
  "RESOURCE",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

/** Parse a positive integer query param, falling back on junk, clamping to max. */
function intParam(raw: string | null, fallback: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
};

// Meta and listing results live in the Vercel Data Cache (unstable_cache), not
// only behind the CDN headers below. The CDN entry expires after s-maxage and
// is per region and per deployment, so each expiry used to re-run these
// queries and wake Neon. The Data Cache survives both; it is cleared by
// revalidateContent()/revalidateCategories() (CACHE_TAGS.list) on admin writes.
// (This replaces a per-instance in-memory Map that every cold start lost.)
const DATA_CACHE_TAGS = [CACHE_TAGS.list];

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
          eq(CategoriesTable.isActive, true)
        )
      )
      .orderBy(CategoriesTable.name),

    db
      .selectDistinct({ readingTime: ContentTable.readingTime })
      .from(ContentTable)
      .where(
        and(
          eq(ContentTable.contentType, contentType),
          eq(ContentTable.status, "PUBLISHED"),
          sql`${ContentTable.readingTime} IS NOT NULL`
        )
      ),
  ]);

  const readingTimes = Array.from(
    new Set(
      distinctReadingTimes
        .map((r) => r.readingTime!)
        .map((t) =>
          t <= 5 ? "Under 5 min" : t <= 10 ? "5–10 min" : "10+ min"
        )
    )
  );

  return { categories, readingTimes };
}

const getMeta = stableCache(fetchMeta, "api-content-meta-v1", DATA_CACHE_TAGS);

function readingTimeBucketToSql(bucket: string): SQL<unknown> | null {
  if (bucket === "Under 5 min") return sql`${ContentTable.readingTime} <= 5`;
  if (bucket === "5–10 min")
    return sql`${ContentTable.readingTime} > 5 AND ${ContentTable.readingTime} <= 10`;
  if (bucket === "10+ min") return sql`${ContentTable.readingTime} > 10`;
  return null;
}

const CONTENT_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600"
};
const META_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
};
// NOTE: there used to be an in-memory per-IP rate limiter here. It did not
// work on serverless (each instance had its own counter) and its Map was never
// pruned, so it grew with every distinct x-forwarded-for value for the life of
// the instance. Rate limiting belongs in the Vercel Firewall
// (docs/neon-cu-runbook.md §2).

type ListQuery = {
  contentType: ContentType;
  page: number;
  limit: number;
  search: string;
  categorySlugs: string[];
  tagSlug: string;
  dateFrom: string;
  dateTo: string;
  readingTimeBuckets: string[];
};

type ListItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: { id: string; name: string; slug: string }[];
};

/** The listing queries. Pure function of the validated params, so it can be cached. */
async function fetchList(q: ListQuery): Promise<{ items: ListItem[]; total: number }> {
  const { contentType, page, limit, search, categorySlugs, tagSlug, dateFrom, dateTo, readingTimeBuckets } = q;
  const offset = (page - 1) * limit;

  // ── Tag EXISTS subquery
  const tagExistsSubquery = tagSlug
    ? sql`EXISTS (
        SELECT 1 FROM ${ContentTagsTable}
        INNER JOIN ${TagsTable} ON ${ContentTagsTable.tagId} = ${TagsTable.id}
        WHERE ${ContentTagsTable.contentId} = ${ContentTable.id}
          AND ${TagsTable.slug} = ${tagSlug}
      )`
    : null;

  // ── Reading time OR subquery
  const readingTimeConds = readingTimeBuckets
    .map(readingTimeBucketToSql)
    .filter((c): c is SQL<unknown> => c !== null);

  const readingTimeSql =
    readingTimeConds.length > 0
      ? sql`(${sql.join(readingTimeConds, sql` OR `)})`
      : null;

  // ── Base conditions
  function buildBaseConditions(): SQL<unknown>[] {
    const conds: SQL<unknown>[] = [
      eq(ContentTable.contentType, contentType),
      eq(ContentTable.status, "PUBLISHED"),
    ];
    if (search) {
      conds.push(
        sql`to_tsvector('english', ${ContentTable.title}) @@ plainto_tsquery('english', ${search})`
      );
    }
    if (dateFrom) conds.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      conds.push(lte(ContentTable.publishedAt, to));
    }
    if (tagExistsSubquery) conds.push(tagExistsSubquery);
    if (readingTimeSql) conds.push(readingTimeSql);
    return conds;
  }

  const mainConditions = buildBaseConditions();
  if (categorySlugs.length > 0) {
    mainConditions.push(
      inArray(CategoriesTable.slug, categorySlugs as [string, ...string[]])
    );
  }

  const countConditions = buildBaseConditions();
  if (categorySlugs.length > 0) {
    countConditions.push(
      sql`${ContentTable.categoryId} IN (
        SELECT id FROM ${CategoriesTable}
        WHERE slug IN (${sql.join(categorySlugs.map((s) => sql`${s}`), sql`, `)})
        AND content_type = ${contentType}
      )`
    );
  }

  // NOTE: this used to run an extra `select({ id })` query with the exact
  // same join/where/order/limit/offset purely to collect contentIds for the
  // tag lookup. `rows.map(r => r.id)` gives the same list for free.
  const [rows, countResult] = await Promise.all([
    db
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
      .where(and(...mainConditions))
      .orderBy(desc(ContentTable.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(ContentTable)
      .where(and(...countConditions)),
  ]);

  const contentIds = rows.map((r) => r.id);

  const tagRows =
    contentIds.length > 0
      ? await db
          .select({
            contentId: ContentTagsTable.contentId,
            tagId: TagsTable.id,
            tagName: TagsTable.name,
            tagSlug: TagsTable.slug,
          })
          .from(ContentTagsTable)
          .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
          .where(inArray(ContentTagsTable.contentId, contentIds))
      : [];

  const tagMap: Record<string, ListItem["tags"]> = {};
  for (const t of tagRows) {
    (tagMap[t.contentId] ??= []).push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
  }

  return {
    // Dates as ISO strings up front: a Data Cache hit returns JSON, so this
    // keeps cached and uncached responses byte-identical.
    items: rows.map((r) => ({
      ...r,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      tags: tagMap[r.id] ?? [],
    })),
    total: Number(countResult[0].total),
  };
}

const getList = stableCache(fetchList, "api-content-list-v1", DATA_CACHE_TAGS);

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);

  if (DEBUG) {
    console.log(`[${requestId}] 🚀 Request started: ${req.url}`);
  }

  try {
    const { searchParams } = new URL(req.url);
    const contentType = (searchParams.get("contentType") ?? "BLOG") as ContentType;
    if (!CONTENT_TYPES.includes(contentType)) {
      // Was a Postgres enum cast error → 500 (and an uncached response).
      return NextResponse.json(
        { error: "Unknown contentType" },
        { status: 400, headers: CONTENT_HEADERS }
      );
    }

    // ── Meta endpoint
    if (searchParams.get("meta") === "1") {
      const meta = await getMeta(contentType);
      return NextResponse.json(
        { categories: meta.categories, readingTimes: meta.readingTimes },
        { headers: META_HEADERS }
      );
    }

    // ── Parse params
    // Junk values used to reach SQL: page=abc gave OFFSET NaN (500), limit=0
    // gave totalPages Infinity, limit=-5 a negative LIMIT (500).
    const page = intParam(searchParams.get("page"), 1, 10_000);
    const limit = intParam(searchParams.get("limit"), 12, 50);
    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() ?? "";
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const categorySlugs = categoryParam
      ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const readingTimeParam = searchParams.get("readingTime")?.trim() ?? "";
    const query: ListQuery = {
      contentType,
      page,
      limit,
      search,
      categorySlugs,
      tagSlug: searchParams.get("tag")?.trim() ?? "",
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
      readingTimeBuckets: readingTimeParam
        ? readingTimeParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    if (DEBUG) {
      console.log(`[${requestId}] 🔍 Filters:`, query);
    }

    const dbQueryStart = Date.now();
    const [{ items, total }, meta] = await Promise.all([
      getList(query),
      getMeta(contentType),
    ]);
    const dbQueryTime = Date.now() - dbQueryStart;

    if (DEBUG) {
      console.log(
        `[${requestId}] 🗃️ Data done: ${dbQueryTime}ms | rows: ${items.length} | total: ${total}`
      );
    }

    const responseTime = Date.now() - startTime;

    // ── Suggestion candidates
    const suggestionCandidates = search
      ? items.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          authorName: r.authorName,
          categoryName: r.categoryName,
          publishedAt: r.publishedAt,
        }))
      : [];

    return NextResponse.json(
      {
        items,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + items.length < total,
        page,
        limit,
        categories: meta.categories,
        readingTimes: meta.readingTimes,
        suggestionCandidates,
        _performance: {
          requestId,
          responseTime,
          parallelDbTime: dbQueryTime,
        },
      },
      { headers: CONTENT_HEADERS }
    );
  } catch (err) {
    const responseTime = Date.now() - startTime;
    // ✅ ERROR logging ALWAYS enabled (important!)
    console.error(`[${requestId}] ❌ ERROR after ${responseTime}ms:`, err);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}
