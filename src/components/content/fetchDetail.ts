// components/content/fetchDetail.ts
// Server-only. NO "use client". Used by all 5 [slug] detail pages.
// Same base URL resolution as fetchContent.ts

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

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
  // EntreChat extras
  interviewee?: string | null;
  industrySector?: string | null;
  businessStage?: string | null;
  interviewFormat?: string | null;
  founderRegion?: string | null;
  successFactor?: string | null;
  country?: string | null;
  state?: string | null;
  // News extras
  source?: string | null;
  sourceType?: string | null;
  // Press extras
  galleryImages?: string[] | null;
};

export type RelatedItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featuredImage: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: ApiTag[];
  interviewee?: string | null;
  source?: string | null;
};

export type DetailApiResponse = {
  item: ContentDetail;
  related: RelatedItem[];
};

/**
 * Fetch a single content item by slug.
 * ISR revalidate = 300s + cache tag for instant admin invalidation.
 * Call revalidateTag(`content-${slug}`) from admin server action after saving.
 */
export async function fetchContentDetail(slug: string): Promise<DetailApiResponse | null> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/content/${slug}`, {
      next: {
        revalidate: 300,
        tags: [`content-${slug}`],
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    return data;
  } catch {
    return null;
  }
}

// ── Shared server-safe utilities ──────────────────────────────────────────────

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