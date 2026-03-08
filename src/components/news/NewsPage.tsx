/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight, Calendar, CalendarDays, ChevronRight,
  Clock, ExternalLink, Search, SlidersHorizontal, Tag, X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Cta from "../common/Cta";
import { getCategoryIcon, MultiSelectDropdown } from "../common/MultiSelectDropdown";
import { AnimatedText, ScrollFade, StaggerChildren } from "../common/ScrollFade";
import { ScrollReveal } from "../common/ScrollReveal";

import { SearchSuggestions } from "./SearchSuggestions";
import { Chip } from "../blogs/Chip";
import { SkeletonCard } from "../blogs/SkeletonCard";


// ─── Types ─────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: Tag[];
};

type ApiResponse = {
  items: NewsItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  // Bundled metadata
  categories: Category[];
  readingTimes: string[];
};

type SearchSuggestion = {
  id: string; 
  title: string; 
  category: string;
  date: string; 
  slug: string; 
  relevance: number;
};

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ✅ Single URL builder — contentType always NEWS, meta bundled in main response
function buildUrl(opts: {
  page?: number; 
  limit?: number; 
  search?: string;
  categorySlug?: string; 
  tagSlug?: string;
  dateFrom?: string; 
  dateTo?: string;
}): string {
  const p = new URLSearchParams({ contentType: "NEWS" });
  if (opts.page)         p.set("page",     String(opts.page));
  if (opts.limit)        p.set("limit",    String(opts.limit));
  if (opts.search)       p.set("search",   opts.search);
  if (opts.categorySlug) p.set("category", opts.categorySlug);
  if (opts.tagSlug)      p.set("tag",      opts.tagSlug);
  if (opts.dateFrom)     p.set("dateFrom", opts.dateFrom);
  if (opts.dateTo)       p.set("dateTo",   opts.dateTo);
  return `/api/content?${p}`;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function NewsPage() {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [selectedTagSlug, setSelectedTagSlug]           = useState("");
  const [selectedReadingTimes, setSelectedReadingTimes] = useState<string[]>([]);
  const [currentPage, setCurrentPage]                   = useState(1);
  const [searchQuery, setSearchQuery]                   = useState("");
  const [debouncedSearch, setDebouncedSearch]           = useState("");
  const [dateRange, setDateRange]                       = useState({ from: "", to: "" });
  const [selectedDateRange, setSelectedDateRange]       = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [allItems, setAllItems]               = useState<NewsItem[]>([]);
  const [newsItems, setNewsItems]             = useState<NewsItem[]>([]);
  const [featuredNews, setFeaturedNews]       = useState<NewsItem | null>(null);
  const [latestHeadlines, setLatestHeadlines] = useState<NewsItem[]>([]);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalItems, setTotalItems]           = useState(0);

  // ── Meta state ──────────────────────────────────────────────────────────────
  const [categories, setCategories]           = useState<Category[]>([]);
  const [readingTimeBuckets, setReadingTimeBuckets] = useState<string[]>([]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading]   = useState(false);

  // ── Search suggestions ──────────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const searchRef         = useRef<HTMLDivElement>(null);
  const filterRef         = useRef<HTMLDivElement>(null);
  const filterAbortRef    = useRef<AbortController | null>(null);
  const searchAbortRef    = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender     = useRef(true);

  // ── Animation variants ──────────────────────────────────────────────────────
  const bannerVariants: Variants = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const bannerSubtitleVariants: Variants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
  };

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  // ── Client-side reading time filter ────────────────────────────────────────
  useEffect(() => {
    // Filter by reading time buckets (client-side since it's a UI grouping)
    if (selectedReadingTimes.length === 0) {
      setNewsItems(allItems);
    } else {
      const filtered = allItems.filter((item) => {
        if (!item.readingTime) return false;
        return selectedReadingTimes.some((bucket) => {
          if (bucket === "Under 5 min") return item.readingTime! <= 5;
          if (bucket === "5–10 min") return item.readingTime! > 5 && item.readingTime! <= 10;
          if (bucket === "10+ min") return item.readingTime! > 10;
          return false;
        });
      });
      setNewsItems(filtered);
    }
  }, [allItems, selectedReadingTimes]);

  // ── On mount: ONE fetch returns news + meta ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl({ page: 1, limit: ITEMS_PER_PAGE }));
        if (!res.ok) return;
        const data: ApiResponse = await res.json();

        setAllItems(data.items);
        setNewsItems(data.items);
        setFeaturedNews(data.items[0] ?? null);
        setLatestHeadlines(data.items.slice(0, 4));
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);

        // Meta comes bundled
        setCategories(data.categories ?? []);
        setReadingTimeBuckets(data.readingTimes ?? []);
      } catch (err) {
        console.error("Init fetch error:", err);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, []);

  // ── Fetch on filter/page change ─────────────────────────────────────────────
  const fetchFilteredNews = useCallback(async () => {
    if (filterAbortRef.current) filterAbortRef.current.abort();
    filterAbortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const res = await fetch(
        buildUrl({
          page:         currentPage,
          limit:        ITEMS_PER_PAGE,
          search:       debouncedSearch || undefined,
          categorySlug: selectedCategorySlug || undefined,
          tagSlug:      selectedTagSlug || undefined,
          dateFrom:     dateRange.from || undefined,
          dateTo:       dateRange.to || undefined,
        }),
        { signal: filterAbortRef.current.signal }
      );
      if (!res.ok) throw new Error("Failed");
      const data: ApiResponse = await res.json();
      
      setAllItems(data.items);
      // Don't set newsItems here - the reading time filter effect will handle it
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
      
      // Update meta if server returned fresher data
      if (data.categories?.length) setCategories(data.categories);
      if (data.readingTimes?.length) setReadingTimeBuckets(data.readingTimes);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setAllItems([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategorySlug, selectedTagSlug, dateRange]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchFilteredNews();
  }, [fetchFilteredNews]);

  // ── Search suggestions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({ q: debouncedSearch, contentType: "NEWS" });
        const res = await fetch(`/api/content/search?${params}`, {
          signal: searchAbortRef.current!.signal,
        });
        if (!res.ok) return;

        const { results } = await res.json() as {
          results: {
            id: string; title: string; slug: string;
            publishedAt: string | null; categoryName: string | null;
          }[];
        };

        const q = debouncedSearch.toLowerCase();

        const suggestions: SearchSuggestion[] = results
          .map((r) => {
            let relevance = 0;
            const titleLower = r.title.toLowerCase();
            if (titleLower.startsWith(q))   relevance += 15;
            if (titleLower.includes(q))     relevance += 10;
            if (r.categoryName?.toLowerCase().includes(q)) relevance += 8;
            return {
              id:       r.id,
              title:    r.title,
              slug:     r.slug,
              category: r.categoryName ?? "News",
              date:     formatDate(r.publishedAt),
              relevance,
            };
          })
          .filter((s) => s.relevance > 0)
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 8);

        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
      }
    })();
  }, [debouncedSearch]);

  // ── Click-outside ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Date range ──────────────────────────────────────────────────────────────
  const applyDateRangeFilter = (range: string) => {
    const now = new Date();
    const from = new Date();
    setSelectedDateRange(range);
    if (range === "custom") { setShowCustomDatePicker(true); return; }
    setShowCustomDatePicker(false);
    if (!range) { setDateRange({ from: "", to: "" }); return; }
    const offsets: Record<string, () => void> = {
      "24h":     () => from.setDate(now.getDate() - 1),
      "week":    () => from.setDate(now.getDate() - 7),
      "month":   () => from.setMonth(now.getMonth() - 1),
      "3months": () => from.setMonth(now.getMonth() - 3),
    };
    offsets[range]?.();
    setDateRange({ from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] });
    setCurrentPage(1);
  };

  const getDateRangeDisplayLabel = () => {
    if (selectedDateRange === "custom") {
      const parts: string[] = [];
      if (dateRange.from) parts.push(`From: ${new Date(dateRange.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
      if (dateRange.to)   parts.push(`To: ${new Date(dateRange.to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
      return parts.join(" • ") || "Custom Range";
    }
    return predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label ?? "";
  };

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSelectedCategorySlug(""); 
    setSelectedTagSlug(""); 
    setSelectedReadingTimes([]);
    setDateRange({ from: "", to: "" }); 
    setSelectedDateRange(""); 
    setShowCustomDatePicker(false);
    setSearchQuery(""); 
    setDebouncedSearch(""); 
    setSearchSuggestions([]);
    setShowSuggestions(false); 
    setCurrentPage(1); 
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () =>
    !!selectedCategorySlug || !!selectedTagSlug || selectedReadingTimes.length > 0 ||
    !!dateRange.from || !!dateRange.to || !!searchQuery;

  const activeFilterCount = [
    !!selectedCategorySlug, 
    !!selectedTagSlug, 
    selectedReadingTimes.length > 0,
    !!(dateRange.from || dateRange.to), 
    !!searchQuery,
  ].filter(Boolean).length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // const openExternalLink = (url: string, title: string) => {
  //   const safe = url.startsWith("http") ? url : `https://${url}`;
  //   window.open(
  //     `/split-view?url=${encodeURIComponent(safe)}&title=${encodeURIComponent(title)}`,
  //     "_blank"
  //   );
  // };

 
  
  const selectedCategory = categories.find((c) => c.slug === selectedCategorySlug);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <main className="bg-background min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading news articles…</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="bg-background min-h-screen">

      {/* ══ BANNER ══════════════════════════════════════════════════════════ */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image src="/news/mobileBannernews.png" alt="News Banner" fill className="object-cover object-center" priority sizes="(max-width: 1024px) 100vw" />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image src="/news/finalNewsbanner.png" alt="News Banner" fill className="object-cover object-center" priority sizes="(min-width: 1024px) 100vw" />
          </div>
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">Women in Business News</span>
                </h1>
              </motion.div>
              <motion.p initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                Stay informed with the latest news, insights, and success stories from women entrepreneurs worldwide
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURED + SIDEBAR ══════════════════════════════════════════════ */}
      <ScrollReveal direction="up" delay={0.2} threshold={0}>
        <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
          <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-6 sm:gap-8">

            {featuredNews && (
              <ScrollReveal direction="left" delay={0.3} className="lg:col-span-2">
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    
                      window.location.href = `/news/${featuredNews.slug}`;
                    
                  }}
                  className="relative block group bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-primary/10 cursor-pointer"
                >
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
                    <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-bold uppercase shadow-lg">
                      Featured Story
                    </span>
                  </div>
                  <div className="relative h-40 sm:h-64 lg:h-[340px] bg-gradient-to-br from-muted to-secondary">
                    {featuredNews.featuredImage ? (
                      <Image src={featuredNews.featuredImage} alt={featuredNews.title} fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105" priority sizes="(max-width: 1024px) 100vw, 66vw" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <div className="text-white/40 text-6xl font-display">{featuredNews.title.charAt(0)}</div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 px-2 sm:px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                        {getCategoryIcon(featuredNews.categoryName ?? "")}
                        {featuredNews.categoryName ?? "News"}
                      </span>
                      {featuredNews.authorName && (
                        <span className="text-xs text-muted-foreground">
                          {featuredNews.authorName}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {featuredNews.title}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-2 leading-relaxed line-clamp-3">
                      {featuredNews.summary}
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          {formatDate(featuredNews.publishedAt)}
                        </div>
                        {featuredNews.readingTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                            {featuredNews.readingTime} min read
                          </div>
                        )}
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 group text-sm sm:text-base w-full sm:w-auto">
                        {featuredNews.externalUrl ? "Read Full Story" : "View Details"}
                        <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            <ScrollReveal direction="right" delay={0.4} className={!featuredNews ? "lg:col-span-3" : ""}>
              <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 shadow-lg border border-border lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground">Latest Headlines</h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  <StaggerChildren>
                    <div className="space-y-3 sm:space-y-4">
                      {latestHeadlines.map((news, i) => (
                        <motion.div key={news.id} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                             
                                window.location.href = `/news/${news.slug}`;
                              
                            }}
                            className="block cursor-pointer pb-3 sm:pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-all duration-200"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-secondary">
                                {news.featuredImage ? (
                                  <Image src={news.featuredImage} alt={news.title} fill className="object-cover" sizes="56px" loading="eager" />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                                    <span className="text-primary/40 text-lg font-display">{news.title.charAt(0)}</span>
                                  </div>
                                )}
                                <div className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wide">
                                    {getCategoryIcon(news.categoryName ?? "")}
                                    <span className="truncate max-w-[60px]">{(news.categoryName ?? "News").split(" ")[0]}</span>
                                  </span>
                                </div>
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1.5 leading-snug line-clamp-2">
                                  {news.title}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(news.publishedAt)}
                                </div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </StaggerChildren>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="ghost"
                    className="w-full text-accent hover:bg-accent/10 hover:text-accent text-sm flex items-center justify-center gap-2"
                    onClick={() => { clearAllFilters(); window.scrollTo({ top: document.getElementById("all-news-section")?.offsetTop ?? 0, behavior: "smooth" }); }}>
                    View All News <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      {/* ══ ALL NEWS GRID ══════════════════════════════════════════════════ */}
      <ScrollFade delay={0.3}>
        <section id="all-news-section" className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-screen-xl mx-auto">

            {/* Header + Search + Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
              <ScrollReveal direction="right" delay={0.2}>
                <div>
                  <AnimatedText as="h2" delay={0.1}>
                    {selectedCategory ? selectedCategory.name : "All News Articles"}
                    {debouncedSearch && <span className="text-lg sm:text-xl text-primary"> — Search: {debouncedSearch}</span>}
                  </AnimatedText>
                  <AnimatedText as="p" delay={0.2}>
                    {isFilterLoading ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Filtering…
                      </span>
                    ) : (
                      <>
                        {newsItems.length} {newsItems.length === 1 ? "article" : "articles"} shown
                        {totalItems !== newsItems.length && ` (filtered from ${totalItems} total)`}
                        {debouncedSearch && ` matching "${debouncedSearch}"`}
                        {getDateRangeDisplayLabel() && ` • ${getDateRangeDisplayLabel()}`}
                      </>
                    )}
                  </AnimatedText>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.3}>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                  {/* SEARCH */}
                  <div className="relative w-full sm:w-64" ref={searchRef}>
                    <form onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); }}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black z-10" />
                      <Input type="search" placeholder="Search news…" className="pl-10 pr-10 w-full bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (debouncedSearch.length >= 2 && searchSuggestions.length > 0) setShowSuggestions(true); }} />
                      {searchQuery && (
                        <button type="button" onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                          <X className="h-4 w-4 text-black" />
                        </button>
                      )}
                    </form>
                    <SearchSuggestions
                      suggestions={searchSuggestions}
                      onSelect={(title) => { setSearchQuery(title); setShowSuggestions(false); }}
                      searchQuery={debouncedSearch}
                      isVisible={showSuggestions}
                      onClose={() => setShowSuggestions(false)}
                    />
                  </div>

                  {/* FILTER */}
                  <div className="relative w-full sm:w-auto" ref={filterRef}>
                    <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2"
                      onClick={() => setIsFilterOpen((v) => !v)}>
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {isAnyFilterActive() && (
                        <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>

                    {isFilterOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-white border border-border rounded-lg shadow-xl z-50 max-h-[80vh] overflow-y-auto p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-foreground">Filter Articles</h4>
                        </div>

                        {/* Category */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
                          <MultiSelectDropdown
                            label="Categories"
                            icon={<CalendarDays className="h-4 w-4" />}
                            options={categories.map((c) => c.name)}
                            selectedValues={selectedCategory ? [selectedCategory.name] : []}
                            onChange={(vals) => {
                              const name = vals[vals.length - 1];
                              const cat = categories.find((c) => c.name === name);
                              setSelectedCategorySlug(cat?.slug ?? "");
                              setCurrentPage(1);
                            }}
                            placeholder="Select category"
                            allOptionLabel="All Categories"
                          />
                        </div>

                        {/* Tags - optional filter */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Filter by Tag</h5>
                          <Input 
                            placeholder="Enter tag name..." 
                            value={selectedTagSlug}
                            onChange={(e) => {
                              setSelectedTagSlug(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Enter tag slug (e.g., &quot;women-entrepreneurs&quot;)</p>
                        </div>

                        {/* Reading Time */}
                        {readingTimeBuckets.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-foreground mb-2">Reading Time</h5>
                            <div className="flex flex-wrap gap-2">
                              {readingTimeBuckets.map((bucket) => (
                                <button key={bucket}
                                  onClick={() => setSelectedReadingTimes((prev) =>
                                    prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]
                                  )}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                    selectedReadingTimes.includes(bucket)
                                      ? "bg-primary text-white border-primary"
                                      : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                  <Clock className="h-3 w-3 inline mr-1" />{bucket}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Date Range */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Date Range
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {predefinedDateRanges.map((r) => (
                              <button key={r.value} onClick={() => applyDateRangeFilter(r.value)}
                                className={`px-3 py-2 text-xs rounded-lg border transition-all duration-200 ${
                                  selectedDateRange === r.value
                                    ? "bg-primary text-white border-primary scale-105"
                                    : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                {r.label}
                              </button>
                            ))}
                          </div>
                          {showCustomDatePicker && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                              className="grid grid-cols-2 gap-3 mt-3 p-3 bg-secondary/30 rounded-lg overflow-hidden">
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">From</label>
                                <Input type="date" value={dateRange.from} className="w-full"
                                  onChange={(e) => { setDateRange((d) => ({ ...d, from: e.target.value })); setCurrentPage(1); }} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">To</label>
                                <Input type="date" value={dateRange.to} className="w-full"
                                  onChange={(e) => { setDateRange((d) => ({ ...d, to: e.target.value })); setCurrentPage(1); }} />
                              </div>
                            </motion.div>
                          )}
                          {(dateRange.from || dateRange.to) && (
                            <button onClick={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); setShowCustomDatePicker(false); }}
                              className="text-xs text-primary hover:text-primary/80 mt-2 transition-colors">
                              Clear date range
                            </button>
                          )}
                        </div>

                        {/* Active chips */}
                        {isAnyFilterActive() && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 mt-2 border-t border-border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-foreground">Active Filters</h5>
                              <button onClick={clearAllFilters} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                <X className="h-3 w-3" /> Clear All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedCategory && (
                                <Chip color="primary" icon={<CalendarDays className="h-3 w-3" />}
                                  onRemove={() => { setSelectedCategorySlug(""); setCurrentPage(1); }}>
                                  {selectedCategory.name}
                                </Chip>
                              )}
                              {selectedTagSlug && (
                                <Chip color="purple" icon={<Tag className="h-3 w-3" />}
                                  onRemove={() => { setSelectedTagSlug(""); setCurrentPage(1); }}>
                                  #{selectedTagSlug}
                                </Chip>
                              )}
                              {selectedReadingTimes.map((bucket) => (
                                <Chip key={bucket} color="blue" icon={<Clock className="h-3 w-3" />}
                                  onRemove={() => setSelectedReadingTimes((prev) => prev.filter((b) => b !== bucket))}>
                                  {bucket}
                                </Chip>
                              ))}
                              {selectedDateRange && selectedDateRange !== "custom" && (
                                <Chip color="green" icon={<Calendar className="h-3 w-3" />}
                                  onRemove={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); }}>
                                  {predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label}
                                </Chip>
                              )}
                              {searchQuery && (
                                <Chip color="amber" icon={<Search className="h-3 w-3" />}
                                  onRemove={() => { setSearchQuery(""); setDebouncedSearch(""); }}>
                                  Search: {searchQuery}
                                </Chip>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Grid / Skeleton / Empty */}
            {isFilterLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : newsItems.length === 0 ? (
              <ScrollFade delay={0.4}>
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {debouncedSearch ? `No articles found matching "${debouncedSearch}".` : "No articles match the current filters."}
                  </p>
                  <Button onClick={clearAllFilters} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                    View All News
                  </Button>
                </div>
              </ScrollFade>
            ) : (
              <>
                <StaggerChildren>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {newsItems.map((news, index) => (
                      <motion.div key={news.id} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                          
                              window.location.href = `/news/${news.slug}`;
                            
                          }}
                          className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 border border-border flex flex-col h-full cursor-pointer"
                        >
                          <div className="relative h-40 sm:h-44 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                            {news.featuredImage ? (
                              <Image src={news.featuredImage} alt={news.title} fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                loading={index < 4 ? "eager" : "lazy"} />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                                <div className="text-white/40 text-5xl font-display">{news.title.charAt(0)}</div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 sm:p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
                                {getCategoryIcon(news.categoryName ?? "")}
                                {(news.categoryName ?? "News").split(" & ")[0]}
                              </span>
                              {news.readingTime && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{news.readingTime} min
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                              {news.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 line-clamp-2 leading-relaxed flex-grow">
                              {news.summary}
                            </p>
                            {news.tags && news.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {news.tags.slice(0, 3).map((tag) => (
                                  <button 
                                    key={tag.id}
                                    onClick={(e) => { 
                                      e.preventDefault(); 
                                      e.stopPropagation();
                                      setSelectedTagSlug(tag.slug); 
                                      setCurrentPage(1); 
                                    }}
                                    className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"
                                  >
                                    #{tag.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border mt-auto">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {formatDate(news.publishedAt)}
                              </div>
                              <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                className="inline-flex items-center gap-1 px-2 py-1 -mx-2 -my-1 rounded-md text-primary group-hover:text-accent group-hover:bg-primary/5 transition-colors">
                                Read <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </StaggerChildren>

                {totalPages > 1 && (
                  <ScrollFade delay={0.5}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 sm:mt-12 pt-8 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Showing page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1} className="gap-1">
                          <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                            p === "…" ? (
                              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                            ) : (
                              <motion.div key={p} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button variant={currentPage === p ? "default" : "outline"} size="sm"
                                  className="w-10 h-10 p-0" onClick={() => handlePageChange(p as number)}>
                                  {p}
                                </Button>
                              </motion.div>
                            )
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages} className="gap-1">
                          Next <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </ScrollFade>
                )}
              </>
            )}
          </div>
        </section>
      </ScrollFade>

      <Cta />
    </main>
  );
}