// app/blog/[legacySlug]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Same recovery as app/[legacySlug]/page.tsx, for the singular `/blog/` prefix
// the old site also used (seen in logs: /blog/celebrating-teachers-on-teachers-day-2).
//
// Kept as a thin wrapper rather than folded into a catch-all so that the plural
// `/blogs/[slug]` route — the real one — stays completely untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound, permanentRedirect } from "next/navigation";
import { findLegacyTarget } from "@/lib/legacy-redirect";

export const revalidate = false;
export const dynamicParams = true;

// Required for on-demand ISR; see app/[legacySlug]/page.tsx.
export async function generateStaticParams() {
  return [];
}

export default async function LegacyBlogSlugPage({
  params,
}: {
  params: Promise<{ legacySlug: string }>;
}) {
  const { legacySlug } = await params;

  const target = await findLegacyTarget(legacySlug);
  if (!target) notFound();

  permanentRedirect(target);
}
