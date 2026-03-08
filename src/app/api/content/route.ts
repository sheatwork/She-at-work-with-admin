// app/api/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  ContentTable,
  CategoriesTable,
  TagsTable,
  ContentTagsTable,
} from "@/db/schema";
import { and, eq, ilike, gte, lte, desc, count, inArray, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType =
  | "BLOG" | "NEWS" | "ENTRECHAT" | "EVENT"
  | "PRESS" | "SUCCESS_STORY" | "RESOURCE";

// ─── In-memory meta cache ─────────────────────────────────────────────────────
//
// WHY: Categories (57 rows) and readingTime buckets (3 values computed from
// ~1900 rows) are static. Without caching, EVERY request re-fetches both —
// adding a full sequential DB round-trip (~400–800ms on Neon) to every page load.
//
// HOW: Module-level Map survives across warm Vercel invocations. After the
// first cold-start hit, all warm requests return meta in <1ms with zero DB cost.
// TTL of 10 min means new categories appear within 10 min of being created.

type MetaEntry = {
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
  cachedAt: number;
};

const metaCache = new Map<string, MetaEntry>();
const META_TTL  = 10 * 60 * 1000; // 10 minutes

function getMetaFromCache(key: string): MetaEntry | null {
  const entry = metaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > META_TTL) {
    metaCache.delete(key);
    return null;
  }
  return entry;
}

async function fetchMeta(contentType: ContentType): Promise<MetaEntry> {
  // ✅ FIX #1: selectDistinct instead of fetching all 1900 rows
  // Before: pulled every readingTime value → JS Set dedup → 3 buckets
  // After:  DB returns only distinct values → far less data transferred
  const [categories, distinctReadingTimes] = await Promise.all([
    db
      .select({ id: CategoriesTable.id, name: CategoriesTable.name, slug: CategoriesTable.slug })
      .from(CategoriesTable)
      .where(and(eq(CategoriesTable.contentType, contentType), eq(CategoriesTable.isActive, true)))
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

  // Map distinct integer values → the 3 display buckets
  const readingTimes = Array.from(
    new Set(
      distinctReadingTimes
        .map((r) => r.readingTime!)
        .map((t) => (t <= 5 ? "Under 5 min" : t <= 10 ? "5–10 min" : "10+ min"))
    )
  );

  const entry: MetaEntry = { categories, readingTimes, cachedAt: Date.now() };
  metaCache.set(contentType, entry);
  return entry;
}

// ─── Cache headers ────────────────────────────────────────────────────────────

const CONTENT_HEADERS = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
const META_HEADERS    = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" };

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = (searchParams.get("contentType") ?? "BLOG") as ContentType;

    // ── ?meta=1 — return only categories + readingTimes ───────────────────────
    // Served from in-memory cache after first hit → zero DB cost on warm instances
    if (searchParams.get("meta") === "1") {
      const meta = getMetaFromCache(contentType) ?? await fetchMeta(contentType);
      return NextResponse.json(
        { categories: meta.categories, readingTimes: meta.readingTimes },
        { headers: META_HEADERS }
      );
    }

    // ── Parse params ──────────────────────────────────────────────────────────
    const page         = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const limit        = Math.min(100, parseInt(searchParams.get("limit")  ?? "12"));
    const offset       = (page - 1) * limit;
    const search       = searchParams.get("search")?.trim()   ?? "";
    const categorySlug = searchParams.get("category")?.trim() ?? "";
    const tagSlug      = searchParams.get("tag")?.trim()      ?? "";
    const dateFrom     = searchParams.get("dateFrom")         ?? "";
    const dateTo       = searchParams.get("dateTo")           ?? "";

    // ── WHERE conditions ──────────────────────────────────────────────────────
    // content_type_status_published_idx covers (contentType, status, publishedAt)
    // so the base filter + ORDER BY publishedAt DESC uses one index scan
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

    // ✅ FIX #2: subqueries instead of separate round-trips for category/tag
    // Before: separate await db.select for category id → then re-query content
    // After:  single SQL with inline correlated subquery — one round-trip
    if (categorySlug) {
      conditions.push(
        sql`${ContentTable.categoryId} = (
          SELECT id FROM categories
          WHERE slug        = ${categorySlug}
            AND content_type = ${contentType}
          LIMIT 1
        )`
      );
    }

    if (tagSlug) {
      conditions.push(
        sql`${ContentTable.id} IN (
          SELECT ct.content_id FROM content_tags ct
          JOIN tags t ON t.id = ct.tag_id
          WHERE t.slug = ${tagSlug}
        )`
      );
    }

    const where = and(...conditions);

    // ── FIX #3: content rows + count run in PARALLEL ──────────────────────────
    // Before: these were parallel ✅ — keeping that
    // After:  also run meta fetch in parallel with content (see below)
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id:           ContentTable.id,
          title:        ContentTable.title,
          slug:         ContentTable.slug,
          summary:      ContentTable.summary,
          featuredImage:ContentTable.featuredImage,
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
        .where(where)
        .orderBy(desc(ContentTable.publishedAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: count() }).from(ContentTable).where(where),
    ]);

    // ── FIX #4: tags via inArray instead of sql.join string building ──────────
    // Before: sql`... IN (${sql.join(ids.map(id => sql`${id}`), sql`,`)})`
    //   → builds a raw string like IN ($1,$2,...$12), bypasses query planner
    // After:  inArray() compiles to = ANY($1::uuid[]) which uses the index
    //   content_tags_content_id_idx efficiently via a bitmap index scan
    const tagMap: Record<string, { id: string; name: string; slug: string }[]> = {};

    // ── FIX #5: tags + meta fetched IN PARALLEL with each other ──────────────
    // Before: tags ran sequentially AFTER content, then meta ran after tags
    //   → 3 sequential round-trips = ~1200–2400ms just in Neon latency
    // After:  tags and meta (cache miss) run at the same time
    //   → 2 parallel round-trips, warm meta = 1 round-trip total
    const tagFetch = rows.length > 0
      ? db
          .select({
            contentId: ContentTagsTable.contentId,
            tagId:     TagsTable.id,
            tagName:   TagsTable.name,
            tagSlug:   TagsTable.slug,
          })
          .from(ContentTagsTable)
          .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
          .where(inArray(ContentTagsTable.contentId, rows.map((r) => r.id)))
      : Promise.resolve([]);

    // getMetaFromCache() is synchronous — if cache is warm this is instant,
    // if cold it fires a DB query in parallel with tagFetch
    const metaFetch = getMetaFromCache(contentType)
      ? Promise.resolve(getMetaFromCache(contentType)!)
      : fetchMeta(contentType);

    const [tagRows, meta] = await Promise.all([tagFetch, metaFetch]);

    for (const t of tagRows) {
      if (!tagMap[t.contentId]) tagMap[t.contentId] = [];
      tagMap[t.contentId].push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
    }

    const totalItems = Number(total);

    return NextResponse.json(
      {
        items:        rows.map((r) => ({ ...r, tags: tagMap[r.id] ?? [] })),
        totalItems,
        totalPages:   Math.ceil(totalItems / limit),
        page,
        limit,
        // ✅ Always bundled — frontend needs only ONE fetch on mount
        categories:   meta.categories,
        readingTimes: meta.readingTimes,
      },
      { headers: CONTENT_HEADERS }
    );

  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}