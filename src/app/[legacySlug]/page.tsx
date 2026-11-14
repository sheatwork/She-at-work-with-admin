// app/[legacySlug]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Root-level catch-all that recovers old WordPress permalinks.
//
// The previous site served articles from the root (`/some-article-title`). After
// the migration those URLs matched nothing and fell through to not-found — ~36%
// of all production traffic, and every one of them a URL Google still has
// indexed. This segment looks the slug up once and issues a permanent redirect
// to its current location.
//
// ROUTE PRIORITY: Next.js always prefers a static segment over a dynamic one, so
// /blogs, /news, /contact, /sheDiaries and every other real route are unaffected.
// This only ever runs for a single-segment path that matches nothing else.
//
// COST: `revalidate = false` means each distinct slug costs exactly one database
// query, ever; the redirect is cached from then on. Malformed paths (scanner
// probes) are rejected by the shape guard in findLegacyTarget() and never reach
// the database at all.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound, permanentRedirect } from "next/navigation";
import { findLegacyTarget } from "@/lib/legacy-redirect";

export const revalidate = false;

export const dynamicParams = true;

// Nothing is worth prebuilding, but generateStaticParams must still exist: in
// Next 15 a dynamic segment without it is rendered on EVERY request
// (`Cache-Control: no-store`, ƒ in the build table) and `revalidate = false` is
// ignored. Returning [] opts the route into on-demand ISR, so each slug is
// resolved once and its 308 / 404 is served from cache afterwards.
export async function generateStaticParams() {
  return [];
}

export default async function LegacySlugPage({
  params,
}: {
  params: Promise<{ legacySlug: string }>;
}) {
  const { legacySlug } = await params;

  const target = await findLegacyTarget(legacySlug);
  if (!target) notFound();

  // 308. Google treats it as equivalent to a 301 and transfers ranking signals.
  permanentRedirect(target);
}
