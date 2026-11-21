// components/content/fetchDetail.ts
import { cache } from "react";
import { stableCache } from "@/lib/data-cache";
import { db } from "@/db";
import { CACHE_TAGS, DETAIL_PREFIXES, contentSlugTag } from "@/lib/revalidate";
import {
  CategoriesTable,
  ContentTable,
  ContentTagsTable,
  TagsTable,
} from "@/db/schema";
import { and, desc, eq, inArray, ne } from "drizzle-orm";

// ============================================
// TYPES
// ============================================

export type ApiTag = { id: string; name: string; slug: string };

export type ContentDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  contentType: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: ApiTag[];
  interviewee?: string | null;
  industrySector?: string | null;
  businessStage?: string | null;
  interviewFormat?: string | null;
  founderRegion?: string | null;
  successFactor?: string | null;
  country?: string | null;
  state?: string | null;
  source?: string | null;
  sourceType?: string | null;
  galleryImages?: string[] | null;
};

export type RelatedItem = {
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
  tags: ApiTag[];
  interviewee?: string | null;
  source?: string | null;
};

export type DetailResponse = {
  item: ContentDetail;
  related: RelatedItem[];
};

// Helper to convert Date to ISO string
function toISOStringOrNull(date: Date | string | null): string | null {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  return date;
}

// ============================================
// DIRECT DB FETCH
// ============================================

// Wrapped in React cache() so the call in generateMetadata and the call in the
// page body share one result per render. Without this every [slug] page ran
// these ~4 queries twice.
/** Route prefix ("/blogs", "/about/press-room", ...) → content types it may render. */
function typesForRoute(routePrefix: string) {
  return Object.entries(DETAIL_PREFIXES)
    .filter(([, prefixes]) => prefixes.includes(routePrefix))
    .map(([type]) => type as (typeof ContentTable.$inferSelect)["contentType"]);
}

/**
 * @param slug        content slug
 * @param routePrefix the detail route asking ("/blogs", "/news", ...). Only rows
 *                    whose contentType belongs under that route are returned, so
 *                    /news/<a-blog-slug> is a 404 instead of a duplicate cached
 *                    copy of the blog post (pure crawl waste, and duplicate
 *                    content for SEO). Must be a string so cache() can key on it.
 */
async function fetchContentDetailUncached(
  slug: string,
  routePrefix: string
): Promise<DetailResponse | null> {
  const allowedTypes = typesForRoute(routePrefix);
  if (allowedTypes.length === 0) {
    throw new Error(`fetchContentDetailFromDB: unknown route prefix ${routePrefix}`);
  }
  try {
    // ── 1. Fetch main content item ──────────────────────────────────────────
    const [item] = await db
      .select({
        id:            ContentTable.id,
        title:         ContentTable.title,
        slug:          ContentTable.slug,
        summary:       ContentTable.summary,
        content:       ContentTable.content,
        featuredImage: ContentTable.featuredImage,
        externalUrl:   ContentTable.externalUrl,
        readingTime:   ContentTable.readingTime,
        publishedAt:   ContentTable.publishedAt,
        authorName:    ContentTable.authorName,
        contentType:   ContentTable.contentType,
        categoryId:    ContentTable.categoryId,
        categoryName:  CategoriesTable.name,
        categorySlug:  CategoriesTable.slug,
      })
      .from(ContentTable)
      .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
      .where(
        and(
          eq(ContentTable.slug, slug),
          eq(ContentTable.status, "PUBLISHED"),
          inArray(ContentTable.contentType, allowedTypes)
        )
      )
      .limit(1);

    if (!item) return null;

    // ── 2. Tags + related in parallel ──────────────────────────────────────
    const tagsQuery = db
      .select({ id: TagsTable.id, name: TagsTable.name, slug: TagsTable.slug })
      .from(ContentTagsTable)
      .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
      .where(eq(ContentTagsTable.contentId, item.id));

    const relatedQuery = item.categoryId
      ? db
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

    const [tags, relatedRows] = await Promise.all([tagsQuery, relatedQuery]);

    // ── 3. Tags for related posts ───────────────────────────────────────────
    const relatedTagMap: Record<string, ApiTag[]> = {};

    if (relatedRows.length > 0) {
      const relatedTagRows = await db
        .select({
          contentId: ContentTagsTable.contentId,
          tagId:     TagsTable.id,
          tagName:   TagsTable.name,
          tagSlug:   TagsTable.slug,
        })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(inArray(ContentTagsTable.contentId, relatedRows.map((r) => r.id)));

      for (const tag of relatedTagRows) {
        if (!relatedTagMap[tag.contentId]) relatedTagMap[tag.contentId] = [];
        relatedTagMap[tag.contentId].push({ id: tag.tagId, name: tag.tagName, slug: tag.tagSlug });
      }
    }

    // ── 4. Return complete response with date conversion ────────────────────
    return {
      item: { 
        ...item, 
        tags,
        publishedAt: toISOStringOrNull(item.publishedAt),
      },
      related: relatedRows.map((r) => ({
        ...r,
        tags: relatedTagMap[r.id] ?? [],
        publishedAt: toISOStringOrNull(r.publishedAt),
      })),
    };

  } catch (error) {
    // Do NOT swallow this into `null`. The detail pages are cached with
    // `revalidate = false`, so a `null` return would render notFound() and
    // Next.js would persist that 404 in the ISR cache permanently — a 2-second
    // Neon blip would take an article offline until the next deploy.
    // Throwing makes the render fail, which Next.js does not cache: the next
    // request retries against the database.
    console.error("[fetchContentDetailFromDB]", error);
    throw error;
  }
}

/**
 * Cached detail lookup.
 *
 * Two cache layers:
 *  - react cache(): generateMetadata and the page body share one call per render.
 *  - unstable_cache (Vercel Data Cache): the result, including `null` for an
 *    unknown slug, persists across requests AND deployments. The ISR page cache
 *    is reset on every deploy, so without this each crawler walking ~1,950
 *    articles and junk URLs re-woke Neon after every deploy, one first-hit at a
 *    time, keeping the compute out of autosuspend most of the day.
 *
 * Invalidated by revalidateContent() (per-slug tag, or the whole detail tag when
 * the published set changes) and revalidateCategories({ detailPages: true }).
 * Errors are never cached: the function throws and the next request retries.
 */
export const fetchContentDetailFromDB = cache(
  (slug: string, routePrefix: string): Promise<DetailResponse | null> => {
    const tags: string[] = [CACHE_TAGS.detail];
    const slugTag = contentSlugTag(slug);
    if (slugTag) tags.push(slugTag);
    return stableCache(fetchContentDetailUncached, "content-detail-v1", tags)(
      slug,
      routePrefix
    );
  }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return ""; }
}

export function cleanText(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&\w+;/g, " ")
    .trim();
}

// ── Event helpers ─────────────────────────────────────────────────────────────

export function extractEventCategory(categoryName: string | null, content: string): string {
  if (categoryName) return categoryName;
  const c = content.toLowerCase();
  if (c.includes("summit") || c.includes("conference")) return "Conferences";
  if (c.includes("workshop") || c.includes("masterclass")) return "Workshops";
  if (c.includes("webinar") || c.includes("online")) return "Webinars";
  if (c.includes("networking") || c.includes("meetup")) return "Networking";
  if (c.includes("seminar") || c.includes("talk")) return "Seminars";
  if (c.includes("dialogue") || c.includes("forum")) return "Forums";
  if (c.includes("launch") || c.includes("inauguration")) return "Launches";
  if (c.includes("award") || c.includes("ceremony")) return "Awards";
  return "Other Events";
}

export function extractEventLocation(content: string): string {
  const c = content.toLowerCase();
  const known = [
    { keyword: "rio de janeiro", location: "Rio de Janeiro, Brazil" },
    { keyword: "iit delhi",      location: "IIT Delhi, India" },
    { keyword: "haryana",        location: "Haryana, India" },
    { keyword: "delhi",          location: "Delhi, India" },
    { keyword: "india",          location: "India" },
    { keyword: "brazil",         location: "Brazil" },
  ];
  for (const k of known) if (c.includes(k.keyword)) return k.location;
  if (c.includes("online") || c.includes("virtual") || c.includes("zoom")) return "Online";
  return "Location TBD";
}

export function extractEventDate(content: string, publishedAt: string | null): string {
  const patterns = [
    /(\d+(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4})/g,
    /([A-Z][a-z]+\s+\d+(?:\s*,\s*\d{4})?)/g,
  ];
  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        let d = match[1].trim().replace(/(\d+)(?:st|nd|rd|th)\b/gi, "$1");
        if (!/^[A-Z][a-z]+$/.test(d)) {
          if (!/\d{4}/.test(d) && publishedAt) d += `, ${publishedAt.substring(0, 4)}`;
          return d;
        }
      }
    }
  }
  if (publishedAt) {
    try {
      const d = new Date(publishedAt);
      if (!isNaN(d.getTime()))
        return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch { /* fallthrough */ }
  }
  return "Date TBD";
}

export function extractEventFormat(content: string): string {
  const c = content.toLowerCase();
  if ((c.includes("online") || c.includes("virtual") || c.includes("zoom")) && !c.includes("in-person")) return "Virtual";
  if ((c.includes("in-person") || c.includes("venue") || c.includes("summit") || c.includes("conference")) && !c.includes("online") && !c.includes("virtual")) return "In-person";
  if (c.includes("hybrid")) return "Hybrid";
  return "To be announced";
}

export function extractEventPrice(content: string): string {
  const c = content.toLowerCase();
  if (c.includes("free") || c.includes("fully funded") || c.includes("complimentary")) return "Free";
  for (const p of [/₹\s*(\d+(?:,\d{3})*)/g, /Rs\.?\s*(\d+(?:,\d{3})*)/g, /\$\s*(\d+(?:,\d{3})*)/g]) {
    const m = p.exec(content);
    if (m?.[1]) return `${p.toString().includes("$") ? "$" : "₹"}${m[1]}`;
  }
  return "Contact for details";
}

export function processWordPressContent(content: string | null): string {
  if (!content) return "<p>Content not available</p>";
  return content
    .replace(/<!--\s*\/?wp:[^>]*-->/g, "")
    .replace(/\[gallery[^\]]*\]/g, "");
}

export function extractGalleryImages(content: string): string[] {
  const images: string[] = [];
  const re = /<img[^>]+src="([^">]+)"/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[1] && !images.includes(m[1])) images.push(m[1]);
  }
  return images;
}