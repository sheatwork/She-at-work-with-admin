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

export const preferredRegion = "sin1";
export const runtime = "nodejs";

type ContentType =
  | "BLOG"
  | "NEWS"
  | "ENTRECHAT"
  | "EVENT"
  | "PRESS"
  | "SUCCESS_STORY"
  | "RESOURCE";

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

  const entry: MetaEntry = { categories, readingTimes, cachedAt: Date.now() };
  setMetaInCache(contentType, entry);
  return entry;
}

// ── Reading time bucket → SQL ─────────────────────────────────────────────────
function readingTimeBucketToSql(bucket: string): SQL<unknown> | null {
  if (bucket === "Under 5 min") return sql`${ContentTable.readingTime} <= 5`;
  if (bucket === "5–10 min")    return sql`${ContentTable.readingTime} > 5 AND ${ContentTable.readingTime} <= 10`;
  if (bucket === "10+ min")     return sql`${ContentTable.readingTime} > 10`;
  return null;
}

const CONTENT_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};
const META_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
};
const SUGGESTIONS_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};

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

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`[${requestId}] 🚀 Request started: ${req.url}`);

  try {
    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(ip)) {
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

    // ── Parse params ──────────────────────────────────────────────────────────
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit  = Math.min(50, parseInt(searchParams.get("limit") ?? "12"));
    const offset = (page - 1) * limit;

    const search        = searchParams.get("search")?.trim()   ?? "";
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const categorySlugs = categoryParam
      ? categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const tagSlug          = searchParams.get("tag")?.trim()         ?? "";
    const dateFrom         = searchParams.get("dateFrom")            ?? "";
    const dateTo           = searchParams.get("dateTo")              ?? "";
    const readingTimeParam = searchParams.get("readingTime")?.trim() ?? "";
    const readingTimeBuckets = readingTimeParam
      ? readingTimeParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    console.log(`[${requestId}] 🔍 Filters:`, {
      contentType, search, categorySlugs, tagSlug,
      dateFrom, dateTo, readingTimeBuckets,
    });

    // ── Tag EXISTS subquery ───────────────────────────────────────────────────
    const tagExistsSubquery = tagSlug
      ? sql`EXISTS (
          SELECT 1 FROM ${ContentTagsTable}
          INNER JOIN ${TagsTable} ON ${ContentTagsTable.tagId} = ${TagsTable.id}
          WHERE ${ContentTagsTable.contentId} = ${ContentTable.id}
            AND ${TagsTable.slug} = ${tagSlug}
        )`
      : null;

    // ── Reading time OR subquery ──────────────────────────────────────────────
    const readingTimeConds = readingTimeBuckets
      .map(readingTimeBucketToSql)
      .filter((c): c is SQL<unknown> => c !== null);

    const readingTimeSql =
      readingTimeConds.length > 0
        ? sql`(${sql.join(readingTimeConds, sql` OR `)})`
        : null;

    // ── Base conditions (shared by main + count, no category) ─────────────────
    function buildBaseConditions(): SQL<unknown>[] {
      const conds: SQL<unknown>[] = [
        eq(ContentTable.contentType, contentType),
        eq(ContentTable.status, "PUBLISHED"),
      ];
      if (search) {
        conds.push(
          sql`to_tsvector('english', ${ContentTable.title}) @@ plainto_tsquery('english', ${search})`,
        );
      }
      if (dateFrom) {
        conds.push(gte(ContentTable.publishedAt, new Date(dateFrom)));
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        conds.push(lte(ContentTable.publishedAt, to));
      }
      if (tagExistsSubquery) conds.push(tagExistsSubquery);
      if (readingTimeSql)    conds.push(readingTimeSql);
      return conds;
    }

    // ── Main query conditions (uses category LEFT JOIN) ───────────────────────
    const mainConditions = buildBaseConditions();
    if (categorySlugs.length > 0) {
      mainConditions.push(
        inArray(CategoriesTable.slug, categorySlugs as [string, ...string[]]),
      );
    }

    // ── Count query conditions (no JOIN — uses IN subquery) ───────────────────
    // KEY FIX: use sql.join with individual params instead of ANY($n)
    // ANY() expects a PG array literal e.g. '{a,b}' — passing a JS string
    // causes "malformed array literal". sql.join generates IN ('a','b') instead.
    const countConditions = buildBaseConditions();
    if (categorySlugs.length > 0) {
      countConditions.push(
        sql`${ContentTable.categoryId} IN (
          SELECT id FROM ${CategoriesTable}
          WHERE slug IN (${sql.join(
            categorySlugs.map((s) => sql`${s}`),
            sql`, `,
          )})
          AND content_type = ${contentType}
        )`,
      );
    }

    // ── Build queries ─────────────────────────────────────────────────────────
    const mainQuery = db
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
      .where(and(...mainConditions))
      .orderBy(desc(ContentTable.publishedAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ total: count() })
      .from(ContentTable)
      .where(and(...countConditions));

    // ── Run in parallel ───────────────────────────────────────────────────────
    const dbQueryStart = Date.now();
    const cachedMeta   = getMetaFromCache(contentType);

    const [rows, countResult, meta] = await Promise.all([
      mainQuery,
      countQuery,
      cachedMeta ? Promise.resolve(cachedMeta) : fetchMeta(contentType),
    ]);

    const total       = countResult[0].total;
    const dbQueryTime = Date.now() - dbQueryStart;
    const metaSource  = cachedMeta ? "cache" : "database";

    console.log(
      `[${requestId}] 🗃️ DB done: ${dbQueryTime}ms | rows: ${rows.length} | total: ${total} | meta: ${metaSource}`,
    );

    // ── Tags ──────────────────────────────────────────────────────────────────
    const tagsStart = Date.now();
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

    const tagsTime     = Date.now() - tagsStart;
    const totalItems   = Number(total);
    const responseTime = Date.now() - startTime;

    const suggestionCandidates = search
      ? rows.map((r) => ({
          id:           r.id,
          title:        r.title,
          slug:         r.slug,
          authorName:   r.authorName,
          categoryName: r.categoryName,
          publishedAt:  r.publishedAt,
        }))
      : [];

    console.log(`[${requestId}] ✅ Done: ${responseTime}ms total`);

    return NextResponse.json(
      {
        items: rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasMore: offset + rows.length < totalItems,
        page,
        limit,
        categories:           meta.categories,
        readingTimes:         meta.readingTimes,
        suggestionCandidates,
        _performance: {
          requestId,
          responseTime,
          parallelDbTime: dbQueryTime,
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