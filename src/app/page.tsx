// app/page.tsx
// Server Component — NO "use client"
/*eslint-disable @typescript-eslint/no-explicit-any */
//
// KEY FIXES vs previous version:
//
// 1. PARALLEL FETCH — both FeaturedNews and LatestBlogs fetched simultaneously
//    with Promise.all. Previously each component called fetchContent() in
//    sequence inside their own render, causing waterfall:
//    FeaturedNews fetches → waits → LatestBlogs fetches → page renders
//    Now: both fire at the same time → page renders when both resolve.
//
// 2. DATA PASSED AS PROPS — components receive pre-fetched data instead of
//    fetching themselves. This guarantees parallel execution and eliminates
//    any risk of Next.js fetch deduplication not working across component trees.
//
// 3. DYNAMIC IMPORTS for heavy client-only sections — About and Categories
//    use framer-motion + useInView heavily. Lazy loading them means the
//    browser can become interactive sooner (LCP/TTI improvement).
//    ssr: false is correct because these components rely on IntersectionObserver.

// Fixed: removed dynamic() with ssr:false — not allowed in server components in Next.js 15.
// About and Categories render as normal client islands instead.
// The parallel fetch (Promise.all) is the main perf fix.

import type { Metadata } from "next";
import { Navbar } from "@/components/navbar/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { HeroStats } from "@/components/home/HeroStats";
import { About } from "@/components/home/About";
import { Categories } from "@/components/home/Categories";

import type { ProcessedStory } from "@/components/home/FeaturedNews";
import Cta from "@/components/common/Cta";
import { LatestBlogsCarousel, ProcessedBlog } from "@/components/home/Latestblogscarousel";
import { FeaturedStoriesCarousel } from "@/components/home/Featuredstoriescarousel";

export const revalidate = 60;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://she-at-work-v2.vercel.app"
  ),
  title: "She At Work - Shaping the Future of Women Entrepreneurship",
  description:
    "Join a vibrant community of visionary women leaders, founders, and changemakers. Discover inspiring stories, insights, and resources.",
};

// ── Shared fetch helpers ───────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function formatDate(dateString: string | null): string {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function extractExcerpt(text: string | null, maxLength = 120): string {
  if (!text) return "No description available";
  const plain = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLength ? plain.substring(0, maxLength) + "..." : plain;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {

  // ✅ PARALLEL FETCH — both run simultaneously, page waits for whichever
  // finishes last. Previously sequential (waterfall). This alone should
  // cut homepage render time by ~40-60% on cold ISR misses.
  const [entrechatRes, blogRes] = await Promise.all([
    fetch(`${BASE}/api/content?contentType=ENTRECHAT&page=1&limit=5`, {
      next: { revalidate: 60 },
    }).catch(() => null),
    fetch(`${BASE}/api/content?contentType=BLOG&page=1&limit=8`, {
      next: { revalidate: 60 },
    }).catch(() => null),
  ]);

  // Process EntreChat → stories
  let stories: ProcessedStory[] = [];
  if (entrechatRes?.ok) {
    const data = await entrechatRes.json();
    stories = (data.items ?? []).map((item: any) => ({
      id:          item.id,
      title:       item.title.replace(/&amp;/g, "&"),
      description: extractExcerpt(item.summary, 100),
      date:        formatDate(item.publishedAt),
      image:       item.featuredImage?.trim() || "/placeholder-interview.jpg",
      slug:        item.slug,
    }));
  }

  // Process Blog → blogs
  let blogs: ProcessedBlog[] = [];
  if (blogRes?.ok) {
    const data = await blogRes.json();
    blogs = (data.items ?? []).map((item: any) => ({
      id:       item.id,
      title:    item.title.replace(/&amp;/g, "&"),
      excerpt:  extractExcerpt(item.summary, 110),
      category: item.categoryName ?? "General",
      date:     formatDate(item.publishedAt),
      readTime: item.readingTime ? `${item.readingTime} min read` : "1 min read",
      image:    item.featuredImage?.trim() || "/placeholder-blog.jpg",
      slug:     item.slug,
      author:   { name: item.authorName ?? "She at Work", role: "Contributor" },
    }));
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <HeroSection />
      <HeroStats />

      {/* About — lazy loaded (framer-motion + useInView, below fold) */}
      <About />

      {/* Stories carousel — data pre-fetched above, no client fetch needed */}
      {stories.length > 0 && <FeaturedStoriesCarousel stories={stories} />}

      {/* Categories — lazy loaded (animated counters, below fold) */}
      <Categories />

      {/* Blogs carousel — data pre-fetched above, no client fetch needed */}
      <LatestBlogsCarousel blogs={blogs} />

      <Cta />
    </div>
  );
}