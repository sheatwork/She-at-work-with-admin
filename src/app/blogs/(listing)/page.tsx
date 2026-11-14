// NO "use client" — Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";

import { blogsConfig } from "@/lib/pageConfigs";
import type { BaseApiResponse } from "@/components/content/types";
import { ContentBanner, ContentGridClient, FeaturedSection, fetchInitialContent } from "@/components/content";

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
  title:       "Inspiring Blogs | She At Work",
  description: "Explore real insights, bold conversations, and practical guidance for women entrepreneurs.",
};

export default async function BlogsPage() {
  const data = (await fetchInitialContent("BLOG", 12)) as BaseApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      <ContentBanner
        bannerDesktop={blogsConfig.bannerDesktop}
        bannerMobile={blogsConfig.bannerMobile}
        bannerAlt={blogsConfig.bannerAlt}
        bannerTitle={blogsConfig.bannerTitle}
        bannerSubtitle={blogsConfig.bannerSubtitle}
      />

      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={blogsConfig}
        gridSectionId={blogsConfig.gridSectionId}
      />

      <ContentGridClient
        config={blogsConfig}
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