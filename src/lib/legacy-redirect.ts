// lib/legacy-redirect.ts
// ─────────────────────────────────────────────────────────────────────────────
// WordPress → Next.js permalink recovery.
//
// The old site served every article from the root: /women-entrepreneurs-yoga-can-empower-you
// The migration moved them under a type prefix AND appended the WordPress post
// id to the slug, so the live URL is now:
//     /blogs/women-entrepreneurs-yoga-can-empower-you-14733
//
// Nothing ever redirected the old form, so those URLs 404. Access logs show they
// are ~36% of all traffic — Google still has them indexed and crawlers keep
// re-checking them because they never receive a definitive answer.
//
// Two slug regimes exist in the table and this module handles both without
// needing to know which row is which:
//   * migrated WordPress rows  → `<original-slug>-<wp_id>`   (5-digit suffix)
//   * rows created in the admin → `<title-slug>-<Date.now()>` (13-digit suffix,
//     see toSlug() in api/admin/content/route.ts)
// Stripping a trailing `-<digits>` normalises both to the original slug.
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { stableCache } from "@/lib/data-cache";
import { db } from "@/db";
import { ContentTable } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { CACHE_TAGS, DETAIL_PREFIXES } from "@/lib/revalidate";

/**
 * Shape of a plausible WordPress permalink.
 *
 * This runs BEFORE any database access and is the reason vulnerability scanners
 * are free: `/wp-login.php`, `/administrator`, `/.env`, `/Trash` and friends all
 * fail the test and never reach Neon. Only lowercase alphanumerics and hyphens
 * get a lookup.
 */
const LEGACY_SLUG_RE = /^[a-z0-9][a-z0-9-]{2,200}$/;

/**
 * Resolve an old root-level permalink to its current path.
 *
 * @returns the new pathname (e.g. `/blogs/foo-14733`), or `null` when the slug
 *          is malformed or matches no published row.
 *
 * Wrapped in `cache()` so a page and its `generateMetadata` share one query.
 * The pages that call this set `revalidate = false`, and the lookup itself is
 * kept in the Vercel Data Cache, so each distinct legacy slug costs one database
 * query until the published set changes, even across deployments.
 */
export const findLegacyTarget = cache(
  async (slug: string): Promise<string | null> => {
    if (!LEGACY_SLUG_RE.test(slug)) return null;
    // Vercel Data Cache: survives deployments (the ISR page cache does not), so
    // a legacy URL, hit or miss, costs one query for as long as the published
    // set is unchanged. Cleared by revalidateContent({ publishedSetChanged }).
    return cachedLookup(slug);
  }
);

async function lookupLegacyTarget(slug: string): Promise<string | null> {
  const [row] = await db
    .select({
      slug: ContentTable.slug,
      contentType: ContentTable.contentType,
    })
    .from(ContentTable)
    .where(
      and(
        eq(ContentTable.status, "PUBLISHED"),
        or(
          // Row kept its original slug (never suffixed).
          eq(ContentTable.slug, slug),
          // Row was suffixed with a WP post id or a creation timestamp.
          sql`regexp_replace(${ContentTable.slug}, '-\\d+$', '') = ${slug}`
        )
      )
    )
    .limit(1);

  if (!row) return null;

  // Reuse the one contentType → route map the revalidation layer already
  // owns, so a new content type can never be handled in two different places.
  const prefix = DETAIL_PREFIXES[row.contentType]?.[0];
  if (!prefix) return null;

  return `${prefix}/${row.slug}`;
}

const cachedLookup = stableCache(lookupLegacyTarget, "legacy-target-v1", [
  CACHE_TAGS.legacy,
]);
