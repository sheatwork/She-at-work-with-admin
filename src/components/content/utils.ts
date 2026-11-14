import type { SearchSuggestion, SuggestionCandidate } from "./types";

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ─── Pagination helper ────────────────────────────────────────────────────────

export function buildPageNumbers(
  current: number,
  total:   number,
  compact  = false,
): (number | "…")[] {
  if (compact) {
    if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
    if (current === 1)     return [1, 2, "…", total];
    if (current === total) return [1, "…", total - 1, total];
    return [1, "…", current, "…", total];
  }
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)           return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)   return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ─── URL builder ─────────────────────────────────────────────────────────────

type UrlOpts = {
  contentType:     string;
  page?:           number;
  limit?:          number;
  search?:         string;
  categorySlugs?:  string[];
  tagSlug?:        string;
  dateFrom?:       string;
  dateTo?:         string;
  readingTime?:    string;
};

export function buildUrl(opts: UrlOpts): string {
  const p = new URLSearchParams({ contentType: opts.contentType });
  if (opts.page)                   p.set("page",            String(opts.page));
  if (opts.limit)                  p.set("limit",           String(opts.limit));
  if (opts.search)                 p.set("search",          opts.search);
  if (opts.categorySlugs?.length)  p.set("category",        opts.categorySlugs.join(","));
  if (opts.tagSlug)                p.set("tag",             opts.tagSlug);
  if (opts.dateFrom)               p.set("dateFrom",        opts.dateFrom);
  if (opts.dateTo)                 p.set("dateTo",          opts.dateTo);
  if (opts.readingTime)            p.set("readingTime",     opts.readingTime);
  return `/api/content?${p}`;
}

// ─── Suggestion ranking ───────────────────────────────────────────────────────

export function rankSuggestions(
  results: SuggestionCandidate[],
  query:   string,
): SearchSuggestion[] {
  if (!results?.length) return [];
  const q = query.toLowerCase();
  return results
    .map((r) => {
      let relevance = 0;
      const t = r.title.toLowerCase();
      if (t.startsWith(q))                           relevance += 15;
      if (t.includes(q))                             relevance += 10;
      if (r.categoryName?.toLowerCase().includes(q)) relevance +=  8;
      if (r.authorName?.toLowerCase().includes(q))   relevance +=  5;
      return {
        id:       r.id,
        title:    r.title,
        slug:     r.slug,
        category: r.categoryName ?? "Content",
        date:     formatDate(r.publishedAt),
        relevance,
      };
    })
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8);
}
