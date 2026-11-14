// NO "use client" — this is a Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";

import { eventsConfig } from "@/lib/pageConfigs";
import type { BaseApiResponse } from "@/components/content/types";
import { ContentBanner, ContentGridClient, FeaturedSection, fetchInitialContent } from "@/components/content";

// ISR: page HTML rebuilt every 60 seconds in the background.
// Returning visitors get instant cached HTML — no blank screen, no waterfall.
// NEON CU: a daily backstop, not the update mechanism.
//
// Content edits reach this page instantly via revalidateContent() in
// lib/revalidate.ts. This TTL only exists so an out-of-band database change
// (a manual SQL edit, a restored backup) cannot pin a stale page forever.
// There are ~10 listing routes in total, so this costs ~10 DB queries per day
// — far inside Neon's 5-minute suspend window. It was 1800s, which meant every
// listing regenerated 48x/day per edge region and kept the compute awake.
export const revalidate = 86400;

export const metadata = {
  title:       "Women Entrepreneurship Events | She At Work",
  description: "Discover upcoming events, workshops, summits and networking opportunities for women entrepreneurs and business leaders.",
};

export default async function EventsPage() {
  const data = (await fetchInitialContent("EVENT", 12)) as BaseApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      {/* ── Server-rendered, zero JS ──────────────────────────────────── */}
      <ContentBanner
        bannerDesktop={eventsConfig.bannerDesktop}
        bannerMobile={eventsConfig.bannerMobile}
        bannerAlt={eventsConfig.bannerAlt}
        bannerTitle={eventsConfig.bannerTitle}
        bannerSubtitle={eventsConfig.bannerSubtitle}
      />

      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={eventsConfig}
        gridSectionId={eventsConfig.gridSectionId}
      />

      {/* ── Client island: only filters + grid are interactive ───────── */}
      <ContentGridClient
        config={eventsConfig}
        initialItems={items}
        initialTotal={data?.totalItems ?? 0}
        initialPages={data?.totalPages ?? 1}
        categories={categories}
        readingTimeBuckets={buckets}
      />

      <Cta />
    </main>
  );
}