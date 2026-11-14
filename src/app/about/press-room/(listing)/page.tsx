// NO "use client" — this is a Server Component
import { Navbar } from "@/components/navbar/Navbar";

import Cta from "@/components/common/Cta";
import { ContentGridClient, FeaturedSection, fetchInitialContent } from "@/components/content";
import type { BaseApiResponse } from "@/components/content/types";
import { pressConfig } from "@/lib/pageConfigs";

// ISR: page HTML rebuilt every 60 seconds in the background.
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
  title:       "Press & Media Coverage | She At Work",
  description: "Read the latest press releases, media features, and coverage about She At Work and the women entrepreneurs we support.",
};

export default async function PressPage() {
  const data = (await fetchInitialContent("PRESS", 12)) as BaseApiResponse | null;

  const items      = data?.items      ?? [];
  const featured   = items[0]         ?? null;
  const headlines  = items.slice(0, 4);
  const categories = data?.categories ?? [];
  const buckets    = data?.readingTimes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <Navbar />

      {/* ── Server-rendered, zero JS ──────────────────────────────────── */}
         <section className="relative px-4 sm:px-6 lg:px-8 pt-28 pb-2 overflow-hidden hero-gradient">
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
              <div className="relative w-full mx-auto text-center text-white px-4">
               
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 px-2 sm:px-0">
                      Press Room
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-4xl mx-auto px-4 sm:px-8 lg:px-0">
                      Latest press releases and news from Sheatwork
                    </p>
            
              </div>
            </section>

      <FeaturedSection
        featuredItem={featured}
        latestItems={headlines}
        config={pressConfig}
        gridSectionId={pressConfig.gridSectionId}
      />

      {/* ── Client island: only filters + grid are interactive ───────── */}
      <ContentGridClient
        config={pressConfig}
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