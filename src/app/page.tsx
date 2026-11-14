// app/page.tsx
// ─────────────────────────────────────────────────────────────────────────
// OPTIMIZED: Server Component — NO self-fetching architecture
// ─────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { HeroStats } from "@/components/home/HeroStats";
import { About } from "@/components/home/About";
import { Categories } from "@/components/home/Categories";
import Cta from "@/components/common/Cta";

import { FeaturedStoriesCarousel } from "@/components/home/Featuredstoriescarousel";
import type { ProcessedBlog } from "@/components/home/Latestblogscarousel";
import { LatestBlogsCarousel } from "@/components/home/Latestblogscarousel";

// ✅ NEW: Import direct DB utilities
import { fetchPageContentMinimal } from "@/db/content";
import { ProcessedStory } from "@/components/home/FeaturedNews";
import { fetchSiteSettingsByGroup } from "@/lib/db/site-settings";

// NEON CU: a daily backstop, not the update mechanism.
//
// Content edits reach this page instantly via revalidateContent() in
// lib/revalidate.ts. This TTL only exists so an out-of-band database change
// (a manual SQL edit, a restored backup) cannot pin a stale page forever.
// There are ~10 listing routes in total, so this costs ~10 DB queries per day
// — far inside Neon's 5-minute suspend window. It was 1800s, which meant every
// listing regenerated 48x/day per edge region and kept the compute awake.
export const revalidate = 86400;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://she-at-work-v2.vercel.app"
  ),
  title: "She At Work - Shaping the Future of Women Entrepreneurship",
  description:
    "Join a vibrant community of visionary women leaders, founders, and changemakers. Discover inspiring stories, insights, and resources.",
};

// ── Helper functions ──────────────────────────────────────────────────────

function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function extractExcerpt(text: string | null | undefined, maxLength = 120): string {
  if (!text) return "No description available";
  const plain = text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength
    ? plain.substring(0, maxLength) + "..."
    : plain;
}

// ── Page Component ────────────────────────────────────────────────────────

export default async function Home() {
  // ✅ OPTIMIZATION 1: Direct DB queries in parallel
  // Previously: fetch("/api/content") → Vercel function → DB
  // Now: Direct DB access → no HTTP, no function, no extra wakeup
  const [entrechatData, blogData, heroStatsData, categoriesData] = await Promise.all([
    fetchPageContentMinimal("ENTRECHAT", 5),
    fetchPageContentMinimal("BLOG", 8),
    fetchSiteSettingsByGroup("hero-stats"),
    fetchSiteSettingsByGroup("categories"),
  ]);


  // ── Transform EntreChat data → ProcessedStory ──────────────────────────
  const stories: ProcessedStory[] = (entrechatData?.items ?? []).map((item) => ({
    id: item.id ?? "",
    title: (item.title ?? "").replace(/&amp;/g, "&"),
    description: extractExcerpt(item.summary, 100),
    date: formatDate(item.createdAt),
    image: item.featuredImage?.trim() || "/home/revisedHomebanner2.webp",
    slug: item.slug ?? "",
  }));

  // ── Transform Blog data → ProcessedBlog ───────────────────────────────
  const blogs: ProcessedBlog[] = (blogData?.items ?? []).map((item) => ({
    id: item.id ?? "",
    title: (item.title ?? "").replace(/&amp;/g, "&"),
    excerpt: extractExcerpt(item.summary, 110),
    category: item.categoryName ?? "General",
    date: formatDate(item.createdAt),
    readTime: item.readingTime ? `${item.readingTime} min read` : "1 min read",
    image: item.featuredImage?.trim() || "/home/revisedHomebanner2.webp",
    slug: item.slug ?? "",
    author: { name: item.authorName ?? "She at Work", role: "Contributor" },
  }));

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <HeroSection />
      <HeroStats data={heroStatsData} />

      {/* About — lazy loaded (framer-motion + useInView, below fold) */}
      <About />

      {/* Stories carousel — data pre-fetched above, no client fetch needed */}
      {stories.length > 0 && <FeaturedStoriesCarousel stories={stories} />}

      {/* Categories — lazy loaded (animated counters, below fold) */}
      <Categories data={categoriesData} />

      {/* Blogs carousel — data pre-fetched above, no client fetch needed */}
      {blogs.length > 0 && <LatestBlogsCarousel blogs={blogs} />}

      <Cta />
    </div>
  );
}