// /app/about/press-room/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Cta from "@/components/common/Cta";
import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  ArrowRight, Calendar, Clock, Search,
  SlidersHorizontal, TrendingUp, X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE  = 12;
const SEARCH_DEBOUNCE = 500;

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiTag { id: string; name: string; slug: string }

interface PressItem {
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
  tags: ApiTag[];
}

interface ApiResponse {
  items: PressItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
}

interface ProcessedPressItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  image: string;
  slug: string;
  tags: ApiTag[];
  categoryName: string | null;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeInLeft: Variants = {
  hidden:  { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeInRight: Variants = {
  hidden:  { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
};
const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)         return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function buildUrl(opts: {
  page?: number;
  search?: string;
  categorySlugs?: string[];
  dateFrom?: string;
  dateTo?: string;
}): string {
  const p = new URLSearchParams({ contentType: "PRESS", limit: String(ITEMS_PER_PAGE) });
  if (opts.page)                  p.set("page",     String(opts.page));
  if (opts.search)                p.set("search",   opts.search);
  if (opts.categorySlugs?.length) p.set("category", opts.categorySlugs.join(","));
  if (opts.dateFrom)              p.set("dateFrom", opts.dateFrom);
  if (opts.dateTo)                p.set("dateTo",   opts.dateTo);
  return `/api/content?${p}`;
}

const cleanText = (text: string | null): string => {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&\w+;/g, " ")
    .trim();
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "Date unavailable";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Date unavailable";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "Date unavailable"; }
};

function processItem(item: PressItem): ProcessedPressItem {
  const clean = cleanText(item.summary);
  return {
    id:           item.id,
    title:        cleanText(item.title) || "Untitled Press Release",
    excerpt:      clean.length > 150 ? clean.slice(0, 150) + "…" : clean || "No excerpt available",
    date:         formatDate(item.publishedAt),
    readTime:     item.readingTime ? `${Math.max(1, item.readingTime)} min read` : "1 min read",
    author:       item.authorName || "She at Work",
    image:        item.featuredImage?.trim() || "",
    slug:         item.slug,
    tags:         item.tags || [],
    categoryName: item.categoryName,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PressRoomPage() {

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery]                     = useState("");
  const [dateRange, setDateRange]                         = useState({ from: "", to: "" });
  const [selectedDateRange, setSelectedDateRange]         = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker]   = useState(false);
  const [currentPage, setCurrentPage]                     = useState(1);
  const [isFilterOpen, setIsFilterOpen]                   = useState(false);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE);

  // ── Data state ────────────────────────────────────────────────────────────
  const [items, setItems]               = useState<ProcessedPressItem[]>([]);
  const [featuredItem, setFeaturedItem] = useState<ProcessedPressItem | null>(null);
  const [categories, setCategories]     = useState<{ id: string; name: string; slug: string }[]>([]);
  const [totalItems, setTotalItems]     = useState(0);
  const [totalPages, setTotalPages]     = useState(1);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading]   = useState(false);

  // ── Image state ───────────────────────────────────────────────────────────
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors]   = useState<Set<string>>(new Set());

  // ── Refs ──────────────────────────────────────────────────────────────────
  const filterRef      = useRef<HTMLDivElement>(null);
  const filterAbortRef = useRef<AbortController | null>(null);
  const isFirstRender  = useRef(true);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl({ page: 1 }));
        if (!res.ok) throw new Error("Failed");
        const data: ApiResponse = await res.json();
        const processed = data.items.map(processItem);
        setFeaturedItem(processed[0] ?? null);   // pinned — never overwritten by filters
        setItems(processed.slice(1));
        setCategories(data.categories ?? []);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Init fetch error:", err);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, []);

  // ── Filter fetch ──────────────────────────────────────────────────────────
  const fetchFiltered = useCallback(async () => {
    if (filterAbortRef.current) filterAbortRef.current.abort();
    filterAbortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const res = await fetch(
        buildUrl({
          page:          currentPage,
          search:        debouncedSearch      || undefined,
          categorySlugs: selectedCategorySlugs.length ? selectedCategorySlugs : undefined,
          dateFrom:      dateRange.from       || undefined,
          dateTo:        dateRange.to         || undefined,
        }),
        { signal: filterAbortRef.current.signal }
      );
      if (!res.ok) throw new Error("Failed");
      const data: ApiResponse = await res.json();
      const processed = data.items.map(processItem);
      setItems(processed);                        // all filtered results go to grid
      if (data.categories?.length) setCategories(data.categories);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setItems([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategorySlugs, dateRange]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchFiltered();
  }, [fetchFiltered]);

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Date range ────────────────────────────────────────────────────────────
  const applyDateRange = (range: string) => {
    const now = new Date(); const from = new Date();
    setSelectedDateRange(range);
    if (range === "custom") { setShowCustomDatePicker(true); return; }
    setShowCustomDatePicker(false);
    if (!range) { setDateRange({ from: "", to: "" }); return; }
    ({ "24h": () => from.setDate(now.getDate() - 1), "week": () => from.setDate(now.getDate() - 7), "month": () => from.setMonth(now.getMonth() - 1), "3months": () => from.setMonth(now.getMonth() - 3) } as Record<string, () => void>)[range]?.();
    setDateRange({ from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] });
    setCurrentPage(1);
  };

  const getDateLabel = () => {
    if (selectedDateRange === "custom") {
      const parts: string[] = [];
      if (dateRange.from) parts.push(`From: ${new Date(dateRange.from).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
      if (dateRange.to)   parts.push(`To: ${new Date(dateRange.to).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
      return parts.join(" • ") || "Custom Range";
    }
    return predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label ?? "";
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSelectedCategorySlugs([]);
    setSearchQuery("");
    setDateRange({ from: "", to: "" });
    setSelectedDateRange("");
    setShowCustomDatePicker(false);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () => selectedCategorySlugs.length > 0 || !!searchQuery || !!dateRange.from || !!dateRange.to;
  const activeFilterCount  = [selectedCategorySlugs.length > 0, !!searchQuery, !!(dateRange.from || dateRange.to)].filter(Boolean).length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageLoad  = (id: string) => setImagesLoaded((p) => { const s = new Set(p); s.add(id); return s; });
  const handleImageError = (id: string) => setImageErrors((p)  => { const s = new Set(p); s.add(id); return s; });

  const selectedCategoryNames = selectedCategorySlugs
    .map((slug) => categories.find((c) => c.slug === slug)?.name)
    .filter(Boolean).join(", ");

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isInitialLoading) return (
    <main className="bg-background min-h-screen">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading press releases…</p>
        </div>
      </div>
    </main>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="bg-background min-h-screen">

      {/* ── Hero (unchanged layout) ─────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-28 pb-2 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="relative w-full mx-auto text-center text-white px-4">
          <ScrollFade>
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: false }}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 px-2 sm:px-0">
                Press Room
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-4xl mx-auto px-4 sm:px-8 lg:px-0">
                Latest press releases and news from Sheatwork
              </p>
            </motion.div>
          </ScrollFade>
        </div>
      </section>

      {/* ── Featured Press (unchanged layout, pinned from initial load) ─────── */}
      {featuredItem && (
        <ScrollFade>
          <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-screen-xl mx-auto">
              <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: false }}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 sm:p-8 mb-8">
                <div className="flex flex-col lg:flex-row gap-6">

                  <motion.div variants={fadeInLeft} className="lg:w-1/2">
                    <div className="relative h-64 sm:h-72 lg:h-96 rounded-xl overflow-hidden bg-gradient-to-br from-muted to-secondary">
                      {featuredItem.image && !imageErrors.has(featuredItem.id) ? (
                        <>
                          {!imagesLoaded.has(featuredItem.id) && (
                            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                          )}
                          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} className="w-full h-full">
                            <Image
                              src={featuredItem.image}
                              alt={featuredItem.title}
                              fill
                              className={`object-cover transition-opacity duration-300 ${imagesLoaded.has(featuredItem.id) ? "opacity-100" : "opacity-0"}`}
                              priority
                              onLoad={() => handleImageLoad(featuredItem.id)}
                              onError={() => handleImageError(featuredItem.id)}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                            />
                          </motion.div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-8xl font-bold text-primary/20">
                            {featuredItem.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div variants={fadeInRight} className="lg:w-1/2 flex flex-col justify-center">
                    <motion.div variants={scaleIn} className="mb-4">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        <TrendingUp className="h-3.5 w-3.5" /> Featured
                      </span>
                    </motion.div>
                    <AnimatedText as="h2" className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4">
                      {featuredItem.title}
                    </AnimatedText>
                    <AnimatedText delay={0.1} className="text-muted-foreground mb-6 line-clamp-3">
                      {featuredItem.excerpt}
                    </AnimatedText>
                    <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" /><span>{featuredItem.date}</span>
                      </div>
                      <div className="h-4 w-px bg-border" />
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" /><span>{featuredItem.readTime}</span>
                      </div>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link href={`/about/press-room/${featuredItem.slug}`}>
                        <Button className="w-full sm:w-auto">
                          Read Full Release <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </motion.div>
                  </motion.div>

                </div>
              </motion.div>
            </div>
          </section>
        </ScrollFade>
      )}

  {/* ── All Press Releases ──────────────────────────────────────────────── */}
<section className="px-4 sm:px-6 lg:px-8 py-12">
  <div className="max-w-screen-xl mx-auto">

    {/* Header + Search + Filter — matching BlogsPage layout exactly */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 sm:mb-12">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
          {selectedCategoryNames || "All Press Releases"}
          {debouncedSearch && <span className="text-primary ml-2">— Search: {debouncedSearch}</span>}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isFilterLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Filtering…
            </span>
          ) : (
            <>
              {totalItems} {totalItems === 1 ? "release" : "releases"} found
              {debouncedSearch && ` matching "${debouncedSearch}"`}
              {getDateLabel() && ` • ${getDateLabel()}`}
            </>
          )}
        </p>
      </div>

      {/* Controls - FIXED: Now stacks vertically on mobile, inline on desktop */}
      <div className="flex-shrink-0 w-full lg:w-auto">
        <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-2 w-full">
          
          {/* Search - full width on mobile */}
          <div className="relative flex-1 w-full sm:w-56 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black z-10" />
            <Input
              type="search"
              placeholder="Search press releases…"
              className="pl-10 pr-10 w-full bg-white"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <X className="h-4 w-4 text-black" />
              </button>
            )}
          </div>

          {/* Filter - full width on mobile */}
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto flex items-center justify-center gap-2"
              onClick={() => setIsFilterOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {isAnyFilterActive() && (
                <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  key="press-filter-panel"
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
                  {/* Filter panel content - unchanged */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-foreground">Filter Press Releases</h4>
                    <button onClick={() => setIsFilterOpen(false)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Category — multi-select chips */}
                  {categories.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <button key={cat.slug}
                            onClick={() => {
                              setSelectedCategorySlugs((prev) =>
                                prev.includes(cat.slug)
                                  ? prev.filter((s) => s !== cat.slug)
                                  : [...prev, cat.slug]
                              );
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                              selectedCategorySlugs.includes(cat.slug)
                                ? "bg-primary text-white border-primary"
                                : "bg-secondary/50 border-border hover:bg-secondary"
                            }`}>
                            {cat.name}
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
                        <button key={r.value} onClick={() => applyDateRange(r.value)}
                          className={`px-3 py-2 text-xs rounded-lg border transition-all duration-200 ${
                            selectedDateRange === r.value
                              ? "bg-primary text-white border-primary scale-105"
                              : "bg-secondary/50 border-border hover:bg-secondary"
                          }`}>
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

                  {/* Active filters */}
                  {isAnyFilterActive() && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 mt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-foreground">Active Filters</h5>
                        <button onClick={clearAllFilters}
                          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                          <X className="h-3 w-3" /> Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedCategorySlugs.map((slug) => {
                          const cat = categories.find((c) => c.slug === slug);
                          return cat ? (
                            <span key={slug} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                              {cat.name}
                              <button onClick={() => { setSelectedCategorySlugs((p) => p.filter((s) => s !== slug)); setCurrentPage(1); }}>
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                        {searchQuery && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                            Search: {searchQuery}
                            <button onClick={() => setSearchQuery("")}><X className="h-3 w-3" /></button>
                          </span>
                        )}
                        {selectedDateRange && selectedDateRange !== "custom" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                            {predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label}
                            <button onClick={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); }}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>

    {/* Rest of your grid and pagination code remains unchanged... */}

          {/* Grid / Skeleton / Empty */}
          {isFilterLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md border border-border animate-pulse">
                  <div className="h-48 bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="pt-4 border-t"><div className="h-3 bg-muted rounded w-1/2" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No press releases found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {debouncedSearch ? `No results matching "${debouncedSearch}".` : "No press releases match the current filters."}
              </p>
              <Button onClick={clearAllFilters} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                View All Releases
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((post, index) => (
                  <motion.div key={post.id} variants={fadeInUp}
                    whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link href={`/about/press-room/${post.slug}`}
                      className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border flex flex-col h-full">

                      {/* Image */}
                      <div className="relative h-48 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                        {post.image && !imageErrors.has(post.id) ? (
                          <>
                            {!imagesLoaded.has(post.id) && (
                              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                            )}
                            <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }} className="w-full h-full">
                              <Image
                                src={post.image}
                                alt={post.title}
                                fill
                                className={`object-cover transition-opacity duration-300 ${imagesLoaded.has(post.id) ? "opacity-100" : "opacity-0"}`}
                                onLoad={() => handleImageLoad(post.id)}
                                onError={() => handleImageError(post.id)}
                                loading={index < 6 ? "eager" : "lazy"}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </motion.div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl font-bold text-primary/20">
                              {post.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow">
                        {post.categoryName && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 uppercase w-fit">
                            {post.categoryName}
                          </span>
                        )}
                        <h3 className="text-base font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">
                          {post.excerpt}
                        </p>

                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <span key={tag.id} className="px-2 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded-full">
                                #{tag.name}
                              </span>
                            ))}
                            {post.tags.length > 2 && (
                              <span className="px-2 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded-full">
                                +{post.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t mt-auto">
                          <div className="flex flex-col text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 mb-1">
                              <Calendar className="h-3 w-3" /><span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /><span>{post.readTime}</span>
                            </div>
                          </div>
                          <motion.div className="inline-flex items-center gap-1 text-sm text-primary group-hover:text-accent transition-all"
                            whileHover={{ x: 5 }}>
                            <span className="group-hover:underline">Read</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </motion.div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex}–{endIndex} of {totalItems} releases
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1} className="gap-1">
                      <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                        p === "…" ? (
                          <span key={`e-${i}`} className="px-2 text-muted-foreground">…</span>
                        ) : (
                          <motion.div key={`p-${p}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
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
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      <ScrollFade>
        <Cta />
      </ScrollFade>
    </main>
  );
}