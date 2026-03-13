/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight, Calendar, CalendarDays, ChevronRight,
  Clock, ExternalLink, Search, SlidersHorizontal, Tag, User, X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Cta from "../common/Cta";
import { getCategoryIcon, MultiSelectDropdown } from "../common/MultiSelectDropdown";
import { AnimatedText, ScrollFade, StaggerChildren } from "../common/ScrollFade";
import { ScrollReveal } from "../common/ScrollReveal";
import { Chip } from "./Chip";
import { SearchSuggestions } from "./SearchSuggestions";
import { SkeletonCard } from "./SkeletonCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE  = 12;
const SEARCH_DEBOUNCE = 500;
const TAG_DEBOUNCE    = 500;

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string };
type ApiTag   = { id: string; name: string; slug: string };

type SuggestionCandidate = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
  authorName: string | null;
  categoryName: string | null;
};

type BlogItem = {
  id: string; title: string; slug: string;
  summary: string | null; featuredImage: string | null;
  externalUrl: string | null; readingTime: number | null;
  publishedAt: string | null; authorName: string | null;
  contentType: string; categoryId: string | null;
  categoryName: string | null; categorySlug: string | null;
  tags: ApiTag[];
};

type ApiResponse = {
  items: BlogItem[]; totalItems: number; totalPages: number;
  page: number; limit: number; categories: Category[]; readingTimes: string[];
  suggestionCandidates?: SuggestionCandidate[];
};

type Suggestion = {
  id: string; title: string; slug: string;
  category: string; date: string; relevance: number;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function buildPageNumbers(current: number, total: number, compact = false): (number | "…")[] {
  if (compact) {
    if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
    if (current === 1)     return [1, 2, "…", total];
    if (current === total) return [1, "…", total - 1, total];
    return [1, "…", current, "…", total];
  }
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)         return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function buildUrl(opts: {
  page?: number; limit?: number; search?: string;
  categorySlugs?: string[]; tagSlug?: string;
  dateFrom?: string; dateTo?: string; readingTime?: string;
}): string {
  const p = new URLSearchParams({ contentType: "BLOG" });
  if (opts.page)                  p.set("page",        String(opts.page));
  if (opts.limit)                 p.set("limit",       String(opts.limit));
  if (opts.search)                p.set("search",      opts.search);
  if (opts.categorySlugs?.length) p.set("category",    opts.categorySlugs.join(","));
  if (opts.tagSlug)               p.set("tag",         opts.tagSlug);
  if (opts.dateFrom)              p.set("dateFrom",    opts.dateFrom);
  if (opts.dateTo)                p.set("dateTo",      opts.dateTo);
  if (opts.readingTime)           p.set("readingTime", opts.readingTime);
  return `/api/content?${p}`;
}

function rankSuggestions(results: SuggestionCandidate[], query: string): Suggestion[] {
  const q = query.toLowerCase();
  return results
    .map((r) => {
      let relevance = 0;
      const t = r.title.toLowerCase();
      if (t.startsWith(q))                           relevance += 15;
      if (t.includes(q))                             relevance += 10;
      if (r.categoryName?.toLowerCase().includes(q)) relevance +=  8;
      if (r.authorName?.toLowerCase().includes(q))   relevance +=  5;
      return {
        id: r.id, title: r.title, slug: r.slug,
        category: r.categoryName ?? "Blog",
        date: formatDate(r.publishedAt), relevance,
      };
    })
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlogsPage() {

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);
  const [tagInput, setTagInput]                           = useState("");
  const [selectedReadingTimes, setSelectedReadingTimes]   = useState<string[]>([]);
  const [currentPage, setCurrentPage]                     = useState(1);
  const [searchQuery, setSearchQuery]                     = useState("");
  const [dateRange, setDateRange]                         = useState({ from: "", to: "" });
  const [selectedDateRange, setSelectedDateRange]         = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker]   = useState(false);

  const debouncedSearch  = useDebounce(searchQuery, SEARCH_DEBOUNCE);
  const debouncedTagSlug = useDebounce(tagInput,    TAG_DEBOUNCE);

  // ── Data state ────────────────────────────────────────────────────────────
  const [blogItems, setBlogItems]             = useState<BlogItem[]>([]);
  const [featuredBlog, setFeaturedBlog]       = useState<BlogItem | null>(null);
  const [latestHeadlines, setLatestHeadlines] = useState<BlogItem[]>([]);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalItems, setTotalItems]           = useState(0);

  // ── Meta ──────────────────────────────────────────────────────────────────
  const [categories, setCategories]                 = useState<Category[]>([]);
  const [readingTimeBuckets, setReadingTimeBuckets] = useState<string[]>([]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading]   = useState(false);

  // ── Suggestions ───────────────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Suggestion[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const searchRef      = useRef<HTMLDivElement>(null);
  const filterRef      = useRef<HTMLDivElement>(null);
  const filterAbortRef = useRef<AbortController | null>(null);
  const isFirstRender  = useRef(true);
  const prevFiltersRef = useRef({
    page: 1, search: "", category: "",
    tag: "", readingTimes: "", dateFrom: "", dateTo: "",
  });

  // ── Animation ─────────────────────────────────────────────────────────────
  const bannerVariants: Variants = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const bannerSubtitleVariants: Variants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
  };

  // ── Apply grid response ───────────────────────────────────────────────────
  const applyResponse = useCallback((data: ApiResponse, query?: string) => {
    setBlogItems(data.items);
    setTotalPages(data.totalPages);
    setTotalItems(data.totalItems);
    if (data.categories?.length)   setCategories(data.categories);
    if (data.readingTimes?.length) setReadingTimeBuckets(data.readingTimes);

    const q = query ?? "";
    if (data.suggestionCandidates?.length && q.length >= 2) {
      const ranked = rankSuggestions(data.suggestionCandidates, q);
      setSearchSuggestions(ranked);
      setShowSuggestions(ranked.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // ── Mount fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl({ page: 1, limit: ITEMS_PER_PAGE }));
        if (!res.ok) return;
        const data: ApiResponse = await res.json();
        applyResponse(data);
        setFeaturedBlog(data.items[0] ?? null);
        setLatestHeadlines(data.items.slice(0, 4));
      } catch (err) {
        console.error("Init fetch error:", err);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [applyResponse]);

  // ── Check if filters changed ──────────────────────────────────────────────
  const haveFiltersChanged = useCallback(() => {
    const currentFilters = {
      page:         currentPage,
      search:       debouncedSearch,
      category:     selectedCategorySlugs.join(","),
      tag:          debouncedTagSlug,
      readingTimes: selectedReadingTimes.join(","),
      dateFrom:     dateRange.from,
      dateTo:       dateRange.to,
    };
    const prev    = prevFiltersRef.current;
    const changed =
      prev.page         !== currentFilters.page         ||
      prev.search       !== currentFilters.search       ||
      prev.category     !== currentFilters.category     ||
      prev.tag          !== currentFilters.tag          ||
      prev.readingTimes !== currentFilters.readingTimes ||
      prev.dateFrom     !== currentFilters.dateFrom     ||
      prev.dateTo       !== currentFilters.dateTo;
    if (changed) prevFiltersRef.current = currentFilters;
    return changed;
  }, [currentPage, debouncedSearch, selectedCategorySlugs, debouncedTagSlug, selectedReadingTimes, dateRange.from, dateRange.to]);

  // ── Filter fetch ──────────────────────────────────────────────────────────
  const fetchFilteredBlogs = useCallback(async () => {
    if (debouncedSearch.length > 0 && debouncedSearch.length < 2) return;
    if (!haveFiltersChanged()) return;

    if (filterAbortRef.current) filterAbortRef.current.abort();
    filterAbortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const res = await fetch(
        buildUrl({
          page:          currentPage,
          limit:         ITEMS_PER_PAGE,
          search:        debouncedSearch.length >= 2 ? debouncedSearch : undefined,
          categorySlugs: selectedCategorySlugs.length ? selectedCategorySlugs : undefined,
          tagSlug:       debouncedTagSlug || undefined,
          dateFrom:      dateRange.from || undefined,
          dateTo:        dateRange.to || undefined,
          readingTime:   selectedReadingTimes.length > 0 ? selectedReadingTimes.join(",") : undefined,
        }),
        { signal: filterAbortRef.current.signal }
      );
      if (!res.ok) throw new Error("Failed");
      const data: ApiResponse = await res.json();
      applyResponse(data, debouncedSearch.length >= 2 ? debouncedSearch : undefined);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setBlogItems([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategorySlugs, debouncedTagSlug, selectedReadingTimes, dateRange, applyResponse, haveFiltersChanged]);

  // ── Trigger fetch when filters change ─────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    const hasActiveFilters =
      selectedCategorySlugs.length > 0 ||
      debouncedTagSlug ||
      selectedReadingTimes.length > 0 ||
      dateRange.from ||
      dateRange.to ||
      debouncedSearch.length >= 2;

    if (!hasActiveFilters && currentPage === 1) return;

    fetchFilteredBlogs();
    return () => { if (filterAbortRef.current) filterAbortRef.current.abort(); };
  }, [
    currentPage, debouncedSearch, selectedCategorySlugs,
    debouncedTagSlug, selectedReadingTimes,
    dateRange.from, dateRange.to, fetchFilteredBlogs,
  ]);

  // ── Clear suggestions when search cleared ─────────────────────────────────
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearch]);

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Date range ────────────────────────────────────────────────────────────
  const applyDateRangeFilter = (range: string) => {
    const now = new Date(); const from = new Date();
    setSelectedDateRange(range);
    if (range === "custom") { setShowCustomDatePicker(true); return; }
    setShowCustomDatePicker(false);
    if (!range) { setDateRange({ from: "", to: "" }); return; }
    switch (range) {
      case "24h":     from.setDate(now.getDate() - 1);    break;
      case "week":    from.setDate(now.getDate() - 7);    break;
      case "month":   from.setMonth(now.getMonth() - 1);  break;
      case "3months": from.setMonth(now.getMonth() - 3);  break;
    }
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSelectedCategorySlugs([]);
    setTagInput("");
    setSelectedReadingTimes([]);
    setDateRange({ from: "", to: "" });
    setSelectedDateRange("");
    setShowCustomDatePicker(false);
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () =>
    selectedCategorySlugs.length > 0 || !!tagInput || selectedReadingTimes.length > 0 ||
    !!dateRange.from || !!dateRange.to || !!searchQuery;

  const activeFilterCount = [
    selectedCategorySlugs.length > 0,
    !!tagInput,
    selectedReadingTimes.length > 0,
    !!(dateRange.from || dateRange.to),
    !!searchQuery,
  ].filter(Boolean).length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCategoryNames = selectedCategorySlugs
    .map((slug) => categories.find((c) => c.slug === slug)?.name)
    .filter(Boolean)
    .join(", ");

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex   = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isInitialLoading) return (
    <main className="bg-background min-h-screen">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading blog articles…</p>
        </div>
      </div>
    </main>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="bg-background min-h-screen">

      {/* ══ BANNER ══════════════════════════════════════════════════════════ */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image src="/blogs/mobileBlogs.png" alt="Blogs Banner" fill className="object-cover object-center" priority sizes="(max-width: 1024px) 100vw" />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image src="/blogs/finalBlogsbanner.png" alt="Blogs Banner" fill className="object-cover object-center" priority sizes="(min-width: 1024px) 100vw" />
          </div>
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">Inspiring Blogs</span>
                </h1>
              </motion.div>
              <motion.p initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                Explore real insights, bold conversations, and practical guidance for women entrepreneurs.
                From funding and strategy to inspiring journeys, discover ideas that help you start, scale, and grow.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURED + SIDEBAR ══════════════════════════════════════════════ */}
      <ScrollReveal direction="up" delay={0.2} threshold={0}>
        <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
          <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-6 sm:gap-8">

            {featuredBlog && (
              <ScrollReveal direction="left" delay={0.3} className="lg:col-span-2">
                <Link href={`/blogs/${featuredBlog.slug}`}
                  className="block relative group bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-primary/10">
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase shadow-lg">
                      Featured Story
                    </span>
                  </div>
                  <div className="relative h-40 sm:h-64 lg:h-[340px] bg-gradient-to-br from-muted to-secondary">
                    {featuredBlog.featuredImage ? (
                      <Image src={featuredBlog.featuredImage} alt={featuredBlog.title} fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105" priority sizes="(max-width: 1024px) 100vw, 66vw" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <div className="text-white/40 text-6xl font-display">{featuredBlog.title.charAt(0)}</div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 px-2 sm:px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                        {getCategoryIcon(featuredBlog.categoryName ?? "")}{featuredBlog.categoryName ?? "Blog"}
                      </span>
                      {featuredBlog.authorName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />{featuredBlog.authorName.split(" ")[0]}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">{featuredBlog.title}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-2 leading-relaxed line-clamp-3">{featuredBlog.summary}</p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 sm:h-4 sm:w-4" />{formatDate(featuredBlog.publishedAt)}</div>
                        {featuredBlog.readingTime && <div className="flex items-center gap-1"><Clock className="h-3 w-3 sm:h-4 sm:w-4" />{featuredBlog.readingTime} min read</div>}
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 group text-sm sm:text-base w-full sm:w-auto">
                        Read Full Article <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            )}

            <ScrollReveal direction="right" delay={0.4} className={!featuredBlog ? "lg:col-span-3" : ""}>
              <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 shadow-lg border border-border lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground">Trending Now</h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  <StaggerChildren>
                    <div className="space-y-3 sm:space-y-4">
                      {latestHeadlines.map((blog, i) => (
                        <motion.div key={blog.id} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                          <Link href={`/blogs/${blog.slug}`}
                            className="block pb-3 sm:pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-secondary">
                                {blog.featuredImage
                                  ? <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover" sizes="56px" loading="eager" />
                                  : <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center"><span className="text-primary/40 text-lg font-display">{blog.title.charAt(0)}</span></div>
                                }
                                <div className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">{i + 1}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wide mb-1.5">
                                  {getCategoryIcon(blog.categoryName ?? "")}
                                  <span className="truncate max-w-[60px]">{(blog.categoryName ?? "Blog").split(" ")[0]}</span>
                                </span>
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1.5 leading-snug line-clamp-2">{blog.title}</h4>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" />{formatDate(blog.publishedAt)}</div>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </StaggerChildren>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <Button variant="ghost" className="w-full text-accent hover:bg-accent/10 hover:text-accent text-sm flex items-center justify-center gap-2"
                    onClick={() => { clearAllFilters(); window.scrollTo({ top: document.getElementById("all-blogs-section")?.offsetTop ?? 0, behavior: "smooth" }); }}>
                    View All Blogs <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      {/* ══ ALL BLOGS GRID ══════════════════════════════════════════════════ */}
      <ScrollFade delay={0.3}>
        <section id="all-blogs-section" className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-screen-xl mx-auto">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 sm:mb-12">
              <ScrollReveal direction="right" delay={0.2} className="min-w-0">
                <div>
                  <AnimatedText as="h2" delay={0.1}>
                    {selectedCategoryNames || "All Blog Articles"}
                    {debouncedSearch.length >= 2 && <span className="text-lg sm:text-xl text-primary"> — Search: {debouncedSearch}</span>}
                  </AnimatedText>
                  <AnimatedText as="p" delay={0.2}>
                    {isFilterLoading ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Filtering…
                      </span>
                    ) : (
                      <>{totalItems} {totalItems === 1 ? "article" : "articles"} found{debouncedSearch.length >= 2 && ` matching "${debouncedSearch}"`}{getDateRangeDisplayLabel() && ` • ${getDateRangeDisplayLabel()}`}</>
                    )}
                  </AnimatedText>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={0.3} className="flex-shrink-0">
                <div className="flex flex-row items-center gap-2 w-full lg:w-auto">

                  {/* SEARCH */}
                  <div className="relative w-full sm:w-56 lg:w-64" ref={searchRef}>
                    <form onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); }}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black z-10" />
                      <Input type="search" placeholder="Search blogs…" className="pl-10 pr-10 w-full bg-white"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (debouncedSearch.length >= 2 && searchSuggestions.length > 0) setShowSuggestions(true); }} />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
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

                  {/* FILTER
                      FIX: w-full on mobile so left-0 anchors correctly inside viewport.
                      On sm+ shrinks to button width and switches to right-0 anchor.
                  */}
                  <div className="relative w-full sm:w-auto" ref={filterRef}>
                    <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2"
                      onClick={() => setIsFilterOpen((v) => !v)}>
                      <SlidersHorizontal className="h-4 w-4" />Filters
                      {isAnyFilterActive() && (
                        <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">{activeFilterCount}</span>
                      )}
                    </Button>

                    {isFilterOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="
                          absolute
                          top-[calc(100%+8px)]
                          left-0 sm:left-auto sm:right-0
                          w-[calc(100vw-2rem)] sm:w-96
                          bg-white border border-border
                          rounded-2xl shadow-2xl
                          z-[9999]
                          max-h-[75vh] overflow-y-auto
                          p-4
                        "
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-foreground">Filter Articles</h4>
                          <button
                            onClick={() => setIsFilterOpen(false)}
                            className="p-1 rounded-lg hover:bg-secondary transition-colors">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>

                        {/* Category — multi-select */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
                          <MultiSelectDropdown
                            label="Categories"
                            icon={<CalendarDays className="h-4 w-4" />}
                            options={categories.map((c) => c.name)}
                            selectedValues={
                              selectedCategorySlugs
                                .map((slug) => categories.find((c) => c.slug === slug)?.name)
                                .filter(Boolean) as string[]
                            }
                            onChange={(vals) => {
                              const slugs = vals
                                .map((name) => categories.find((c) => c.name === name)?.slug)
                                .filter(Boolean) as string[];
                              setSelectedCategorySlugs(slugs);
                              setCurrentPage(1);
                            }}
                            placeholder="Select categories"
                            allOptionLabel="All Categories"
                          />
                        </div>

                        {/* Tags */}
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" /> Filter by Tag
                          </h5>
                          <Input placeholder="Enter tag slug…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="w-full" />
                        </div>

                        {/* Reading Time */}
                        {readingTimeBuckets.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-foreground mb-2">Reading Time</h5>
                            <div className="flex flex-wrap gap-2">
                              {readingTimeBuckets.map((bucket) => (
                                <button key={bucket}
                                  onClick={() => { setSelectedReadingTimes((p) => p.includes(bucket) ? p.filter((b) => b !== bucket) : [...p, bucket]); setCurrentPage(1); }}
                                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedReadingTimes.includes(bucket) ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
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
                                className={`px-3 py-2 text-xs rounded-lg border transition-all duration-200 ${selectedDateRange === r.value ? "bg-primary text-white border-primary scale-105" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
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
                              {/* Multi-category chips — one per selected category */}
                              {selectedCategorySlugs.map((slug) => {
                                const cat = categories.find((c) => c.slug === slug);
                                return cat ? (
                                  <Chip key={slug} color="primary" icon={<CalendarDays className="h-3 w-3" />}
                                    onRemove={() => { setSelectedCategorySlugs((prev) => prev.filter((s) => s !== slug)); setCurrentPage(1); }}>
                                    {cat.name}
                                  </Chip>
                                ) : null;
                              })}
                              {tagInput && <Chip color="purple" icon={<Tag className="h-3 w-3" />} onRemove={() => { setTagInput(""); setCurrentPage(1); }}>#{tagInput}</Chip>}
                              {selectedReadingTimes.map((b) => (
                                <Chip key={b} color="blue" icon={<Clock className="h-3 w-3" />} onRemove={() => setSelectedReadingTimes((p) => p.filter((x) => x !== b))}>{b}</Chip>
                              ))}
                              {selectedDateRange && selectedDateRange !== "custom" && (
                                <Chip color="green" icon={<Calendar className="h-3 w-3" />} onRemove={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); }}>
                                  {predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label}
                                </Chip>
                              )}
                              {searchQuery && <Chip color="amber" icon={<Search className="h-3 w-3" />} onRemove={() => setSearchQuery("")}>Search: {searchQuery}</Chip>}
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
            ) : blogItems.length === 0 ? (
              <ScrollFade delay={0.4}>
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {debouncedSearch.length >= 2 ? `No articles found matching "${debouncedSearch}".` : "No articles match the current filters."}
                  </p>
                  <Button onClick={clearAllFilters} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">View All Blogs</Button>
                </div>
              </ScrollFade>
            ) : (
              <>
                <StaggerChildren>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {blogItems.map((blog, index) => (
                      <motion.div key={blog.id} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
                        <Link href={`/blogs/${blog.slug}`}
                          className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 border border-border flex flex-col h-full">
                          <div className="relative h-40 sm:h-44 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                            {blog.featuredImage
                              ? <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" loading={index < 4 ? "eager" : "lazy"} />
                              : <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center"><div className="text-white/40 text-5xl font-display">{blog.title.charAt(0)}</div></div>
                            }
                          </div>
                          <div className="p-4 sm:p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
                                {getCategoryIcon(blog.categoryName ?? "")}{(blog.categoryName ?? "Blog").split(" & ")[0]}
                              </span>
                              {blog.readingTime && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{blog.readingTime} min</span>}
                            </div>
                            <h3 className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">{blog.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 line-clamp-2 leading-relaxed flex-grow">{blog.summary}</p>
                            {blog.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {blog.tags.slice(0, 3).map((tag) => (
                                  <button key={tag.id}
                                    onClick={(e) => { e.preventDefault(); setTagInput(tag.slug); setCurrentPage(1); }}
                                    className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors">
                                    #{tag.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border mt-auto">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{formatDate(blog.publishedAt)}</div>
                              <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                className="inline-flex items-center gap-1 px-2 py-1 -mx-2 -my-1 rounded-md text-primary group-hover:text-accent group-hover:bg-primary/5 transition-colors">
                                Read <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </motion.div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </StaggerChildren>

                {totalPages > 1 && (
                  <ScrollFade delay={0.5}>
                    <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
                      {/* Mobile */}
                      <div className="flex sm:hidden flex-col items-center gap-3">
                        <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
                        <div className="flex items-center gap-1.5 w-full justify-center flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="h-9 px-3 gap-1 text-xs">
                            <ArrowRight className="h-3 w-3 rotate-180" />Prev
                          </Button>
                          {buildPageNumbers(currentPage, totalPages, true).map((p, i) =>
                            p === "…"
                              ? <span key={`me-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                              : <motion.div key={`m-${p}`} whileTap={{ scale: 0.9 }}><Button variant={currentPage === p ? "default" : "outline"} size="sm" className="h-9 w-9 p-0 text-xs" onClick={() => handlePageChange(p as number)}>{p}</Button></motion.div>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-9 px-3 gap-1 text-xs">
                            Next<ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:flex flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground shrink-0">Showing {startIndex + 1}–{endIndex} of {totalItems} articles</p>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1">
                            <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {buildPageNumbers(currentPage, totalPages, false).map((p, i) =>
                              p === "…"
                                ? <span key={`de-${i}`} className="px-2 text-muted-foreground">…</span>
                                : <motion.div key={`d-${p}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}><Button variant={currentPage === p ? "default" : "outline"} size="sm" className="w-10 h-10 p-0" onClick={() => handlePageChange(p as number)}>{p}</Button></motion.div>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">
                            Next <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
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