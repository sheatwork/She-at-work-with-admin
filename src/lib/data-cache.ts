// lib/data-cache.ts
// ─────────────────────────────────────────────────────────────────────────────
// unstable_cache with a key that survives deployments.
//
// The point of caching the public DB reads in the Vercel Data Cache is that it
// outlives deployments (the ISR page cache does not). But Next 15's
// unstable_cache folds `cb.toString()` into every cache key, and the minified
// source of a function changes whenever unrelated code shifts the bundler's
// mangled names. A plain unstable_cache(fn) therefore silently loses all its
// entries on most deploys: verified locally (rebuild after adding one unrelated
// route → every /api/content and legacy lookup missed again).
//
// Pinning toString() to a fixed name makes the key depend only on `key` and the
// call arguments. Bump the version suffix in `key` whenever the returned shape
// changes, so old entries are never read with the new code.
// ─────────────────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache";

/**
 * Cache an async function in the Data Cache, indefinitely, under a stable key.
 * Entries are invalidated only through `revalidateTag` on one of `tags`.
 * Rejections are not cached.
 *
 * @param fn   the uncached function; its arguments must be JSON-serialisable
 * @param key  stable, versioned name, e.g. "content-detail-v1"
 * @param tags cache tags (see CACHE_TAGS in lib/revalidate.ts)
 */
export function stableCache<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  key: string,
  tags: string[]
): (...args: A) => Promise<R> {
  const cb = (...args: A) => fn(...args);
  cb.toString = () => key;
  return unstable_cache(cb, [key], { tags, revalidate: false });
}
