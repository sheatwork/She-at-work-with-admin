// lib/revalidate.ts
// ─────────────────────────────────────────────────────────────────────────────
// On-demand ISR invalidation for admin writes.
//
// Public pages are cached (listings for 24h, detail pages indefinitely), so
// without this an edit would not appear on the live site. Calling
// revalidateContent() after a successful write pushes the change out instantly
// while keeping the cache — and therefore the Neon compute savings — intact.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";

/** contentType → public listing routes that render it. */
const LISTING_ROUTES: Record<string, string[]> = {
  BLOG:          ["/blogs"],
  NEWS:          ["/news"],
  EVENT:         ["/events"],
  ENTRECHAT:     ["/entrechat"],
  PRESS:         ["/about/press-room"],
  SUCCESS_STORY: ["/about/press-room"],
};

/** contentType → route prefixes under which a `[slug]` detail page lives. */
export const DETAIL_PREFIXES: Record<string, string[]> = {
  BLOG:          ["/blogs"],
  NEWS:          ["/news"],
  EVENT:         ["/events"],
  ENTRECHAT:     ["/entrechat"],
  PRESS:         ["/about/press-room", "/press"],
  SUCCESS_STORY: ["/about/press-room", "/press"],
};

/**
 * Invalidate the cached public pages affected by a content write.
 * Safe to call with an unknown contentType — the home page is still refreshed.
 *
 * @param contentType content_type enum value of the written row
 * @param slug        slug of the written row, when the detail page should refresh too
 * @param opts.publishedSetChanged true when the write changed WHICH rows are
 *        published (a publish, an unpublish, or deleting a published row).
 *        Only then can a cached legacy-permalink 308/404 be wrong.
 */
export function revalidateContent(
  contentType?: string | null,
  slug?: string | null,
  opts: { publishedSetChanged?: boolean } = {}
) {
  // The home page pulls BLOG + ENTRECHAT carousels and site settings.
  revalidatePath("/");

  // Legacy-permalink lookups (app/[legacySlug], app/blog/[legacySlug]) cache
  // their 308 or 404 indefinitely. Clearing them makes every cached legacy URL
  // re-run its lookup query on its next hit — legacy URLs are ~36% of traffic,
  // so this is only worth doing when the set of published rows actually changed
  // (e.g. a crawler probed a slug before its article was published). Ordinary
  // edits to an already-published row never change where a legacy URL points.
  if (opts.publishedSetChanged) {
    revalidatePath("/[legacySlug]", "page");
    revalidatePath("/blog/[legacySlug]", "page");
  }

  if (!contentType) return;

  for (const route of LISTING_ROUTES[contentType] ?? []) {
    revalidatePath(route);
  }

  if (slug) {
    for (const prefix of DETAIL_PREFIXES[contentType] ?? []) {
      revalidatePath(`${prefix}/${slug}`);
    }
  }
}

/** Invalidate pages driven by site settings (home page hero stats / categories). */
export function revalidateSiteSettings() {
  revalidatePath("/");
}

/**
 * Invalidate what a category write touches.
 *
 * Categories are rendered in two places: the filter panel on every listing
 * page, and the category chip (name + slug) on every detail page. Detail pages
 * are cached with `export const revalidate = false`, so a rename needs an
 * explicit push — but busting every detail page of a type means each one
 * re-renders (~4 queries) on its next hit, crawlers included. So detail pages
 * are only invalidated when what they display changed:
 *   - create      → no row uses the category yet          → listings only
 *   - deactivate  → the detail chip ignores isActive      → listings only
 *   - description → not shown on detail pages             → listings only
 *   - rename      → chip text and link change             → listings + details
 *
 * `revalidatePath(route, "page")` on a dynamic segment invalidates every cached
 * page under it in one call — there is no need to enumerate slugs.
 *
 * @param contentType content_type of the written category; when omitted every
 *                    public content route is invalidated.
 * @param opts.detailPages also invalidate every detail page of that type.
 */
export function revalidateCategories(
  contentType?: string | null,
  opts: { detailPages?: boolean } = {}
) {
  revalidatePath("/");

  const types = contentType
    ? [contentType]
    : Object.keys(LISTING_ROUTES);

  for (const type of types) {
    for (const route of LISTING_ROUTES[type] ?? []) {
      revalidatePath(route);
    }
    if (!opts.detailPages) continue;
    for (const prefix of DETAIL_PREFIXES[type] ?? []) {
      // Dynamic segment — invalidates all cached slugs under this prefix.
      revalidatePath(`${prefix}/[slug]`, "page");
    }
  }
}
