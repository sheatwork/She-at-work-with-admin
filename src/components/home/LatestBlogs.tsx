"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Clock, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featuredImage: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

interface ProcessedBlog {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  slug: string;
  author: { name: string; role?: string };
}

// ─── Category badge colours ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Leadership:       "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Finance:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Marketing:        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Technology:       "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Wellness:         "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Growth:           "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  Strategy:         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Innovation:       "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Success Stories":"bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  General:          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Date unavailable";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "Date unavailable";
  }
};

const extractExcerpt = (text: string | null, maxLength = 150): string => {
  if (!text) return "No excerpt available";
  const clean = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return clean.length <= maxLength ? clean : clean.substring(0, maxLength) + "...";
};

// readingTime comes from API (integer minutes); fall back to a label if null
const readTimeLabel = (minutes: number | null): string => {
  if (!minutes) return "1 min read";
  return `${minutes} min read`;
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const BlogCardSkeleton = () => (
  <div className="rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
    <div className="w-full bg-muted" style={{ paddingBottom: "56.25%" }} />
    <div className="p-4 sm:p-5 space-y-3">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-5 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-4/5" />
      <div className="h-3 bg-muted rounded w-1/4 mt-4" />
    </div>
  </div>
);

// ─── Blog Card ────────────────────────────────────────────────────────────────

const BlogCard = ({ blog, index }: { blog: ProcessedBlog; index: number }) => {
  const categoryColor = CATEGORY_COLORS[blog.category] ?? CATEGORY_COLORS.General;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group flex flex-col rounded-2xl bg-card border border-border overflow-hidden
        transition-all duration-300 ease-out hover:-translate-y-1.5
        hover:shadow-[0_16px_40px_rgba(0,0,0,0.10)] h-full"
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <Image
          src={blog.image}
          alt={blog.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
            {blog.category}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3 shrink-0" />
            {blog.readTime}
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-bold mb-2 line-clamp-2 text-foreground
          group-hover:text-primary transition-colors duration-300 leading-snug">
          {blog.title}
        </h3>

        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
          {blog.excerpt}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{blog.date}</span>
          </span>
          <Link href={`/blogs/${blog.slug}`}>
            <span className="text-xs sm:text-sm font-medium text-primary
              flex items-center gap-1 group-hover:gap-2 transition-all duration-300 whitespace-nowrap">
              Read More
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LatestBlogs = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);
  const [blogs, setBlogs] = useState<ProcessedBlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch from API
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`/api/content?contentType=BLOG&page=1&limit=8`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        const processed: ProcessedBlog[] = (data.items as ApiContentItem[]).map((item) => ({
          id: item.id,
          title: item.title.replace(/&amp;/g, "&"),
          excerpt: extractExcerpt(item.summary, 110),
          // Use DB category name if present, else "General"
          category: item.categoryName ?? "General",
          date: formatDate(item.publishedAt),
          readTime: readTimeLabel(item.readingTime),
          image: item.featuredImage?.trim() || "/placeholder-blog.jpg",
          slug: item.slug,
          author: {
            name: item.authorName ?? "She at Work",
            role: "Contributor",
          },
        }));

        setBlogs(processed);
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        setBlogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Responsive columns
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480)       setItemsPerView(1);
      else if (w < 640)  setItemsPerView(2);
      else if (w < 1024) setItemsPerView(2);
      else if (w < 1280) setItemsPerView(3);
      else               setItemsPerView(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalItems  = blogs.length;
  const maxIndex    = Math.max(0, totalItems - itemsPerView);
  const totalPages  = Math.ceil(totalItems / itemsPerView);

  const next = () => setCurrentIndex((p) => Math.min(p + itemsPerView, maxIndex));
  const prev = () => setCurrentIndex((p) => Math.max(p - itemsPerView, 0));

  const visibleBlogs = blogs.slice(currentIndex, currentIndex + itemsPerView);

  const gridCols =
    itemsPerView === 1 ? "grid-cols-1" :
    itemsPerView === 2 ? "grid-cols-2" :
    itemsPerView === 3 ? "grid-cols-3" :
    "grid-cols-4";

  return (
    <section className="py-10 px-4 sm:py-14 sm:px-6 md:py-16 md:px-10 lg:py-20 lg:px-16 xl:px-20 bg-background">
      <div className="mx-auto max-w-screen-xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10"
        >
          <div>
            <Badge className="mb-2.5 text-xs sm:text-sm bg-secondary text-primary rounded-full px-3 py-1">
              Fresh Insights
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
              Latest from Our Blog
            </h2>
          </div>
          <Link href="/blogs" className="hidden sm:block shrink-0">
            <Button variant="ghost" className="text-primary">
              View All Blogs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Desktop arrows */}
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            aria-label="Previous posts"
            className={`hidden sm:flex absolute -left-12 lg:-left-14 top-1/2 -translate-y-1/2 z-10
              items-center justify-center w-10 h-10 rounded-full
              bg-background border border-border shadow-md hover:bg-accent transition-all duration-200
              ${currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:shadow-lg"}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            disabled={currentIndex >= maxIndex}
            aria-label="Next posts"
            className={`hidden sm:flex absolute -right-12 lg:-right-14 top-1/2 -translate-y-1/2 z-10
              items-center justify-center w-10 h-10 rounded-full
              bg-background border border-border shadow-md hover:bg-accent transition-all duration-200
              ${currentIndex >= maxIndex ? "opacity-30 cursor-not-allowed" : "hover:shadow-lg"}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Cards grid */}
          <div ref={containerRef} className="overflow-hidden">
            {isLoading ? (
              <div className={`grid ${gridCols} gap-4 sm:gap-5 lg:gap-6`}>
                {Array.from({ length: itemsPerView }).map((_, i) => (
                  <BlogCardSkeleton key={i} />
                ))}
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                No blog posts available yet.
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className={`grid ${gridCols} gap-4 sm:gap-5 lg:gap-6`}
              >
                {visibleBlogs.map((blog, i) => (
                  <BlogCard key={blog.id} blog={blog} index={i} />
                ))}
              </motion.div>
            )}
          </div>

          {/* Mobile floating arrows */}
          {totalPages > 1 && !isLoading && (
            <div className="sm:hidden flex justify-between absolute top-1/3 left-0 right-0 z-10 px-1 pointer-events-none">
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                className={`pointer-events-auto rounded-full p-2 bg-background/90 backdrop-blur-sm
                  border border-border shadow-md transition-opacity
                  ${currentIndex === 0 ? "opacity-25 cursor-not-allowed" : "opacity-100"}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={next}
                disabled={currentIndex >= maxIndex}
                className={`pointer-events-auto rounded-full p-2 bg-background/90 backdrop-blur-sm
                  border border-border shadow-md transition-opacity
                  ${currentIndex >= maxIndex ? "opacity-25 cursor-not-allowed" : "opacity-100"}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pagination dots */}
          {totalPages > 1 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center gap-2 mt-6 sm:mt-8"
            >
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageStart = i * itemsPerView;
                const isActive = currentIndex >= pageStart && currentIndex < pageStart + itemsPerView;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(pageStart)}
                    aria-label={`Go to page ${i + 1}`}
                    className={`rounded-full transition-all duration-300
                      ${isActive ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted hover:bg-muted-foreground"}`}
                  />
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Mobile "View All" CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 text-center sm:hidden"
        >
          <Link href="/blogs">
            <Button variant="outline" className="font-semibold w-full max-w-xs">
              View All Blogs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

      </div>
    </section>
  );
};