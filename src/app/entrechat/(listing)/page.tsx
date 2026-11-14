// NO "use client" — Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";

import { entreChatConfig } from "@/lib/pageConfigs";
import type { EntreChatApiResponse } from "@/components/content/types";
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
  title:       "EntreChat Community | She At Work",
  description: "Candid conversations with inspiring women entrepreneurs sharing real journeys and experiences.",
};

export default async function EntreChatPage() {
  const data = (await fetchInitialContent("ENTRECHAT", 12)) as EntreChatApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      <ContentBanner
        bannerDesktop={entreChatConfig.bannerDesktop}
        bannerMobile={entreChatConfig.bannerMobile}
        bannerAlt={entreChatConfig.bannerAlt}
        bannerTitle={entreChatConfig.bannerTitle}
        bannerSubtitle={entreChatConfig.bannerSubtitle}
      />

      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={entreChatConfig}
        gridSectionId={entreChatConfig.gridSectionId}
      />

      {/* Pass all EntreChat-specific filter options from server data */}
      <ContentGridClient
        config={entreChatConfig}
        initialItems={items}
        initialTotal={data?.totalItems ?? 0}
        initialPages={data?.totalPages ?? 1}
        categories={categories}
        readingTimeBuckets={buckets}
        initialIndustrySectors={data?.industrySectors  ?? []}
        initialBusinessStages={data?.businessStages    ?? []}
        initialInterviewFormats={data?.interviewFormats ?? []}
        initialFounderRegions={data?.founderRegions    ?? []}
        initialSuccessFactors={data?.successFactors    ?? []}
        initialCountries={data?.countries              ?? []}
        initialStates={data?.states                    ?? []}
      />

      <Cta />
    </main>
  );
}