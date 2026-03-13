/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Building,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  Search,
  SlidersHorizontal,
  TrendingUp,
  User,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Cta from "../common/Cta";
import { getCategoryIcon, MultiSelectDropdown } from "../common/MultiSelectDropdown";
import { AnimatedText, ScrollFade, StaggerChildren } from "../common/ScrollFade";
import { ScrollReveal } from "../common/ScrollReveal";
import { Chip } from "../blogs/Chip";
import { SkeletonCard } from "../blogs/SkeletonCard";
import { SearchSuggestions } from "./SearchSuggestions";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE  = 12;
const SEARCH_DEBOUNCE = 300;

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tag = { id: string; name: string; slug: string };

type EntreChatItem = {
  id: string; title: string; slug: string;
  summary: string | null; excerpt: string | null;
  featuredImage: string | null; externalUrl: string | null;
  readingTime: number | null; publishedAt: string | null;
  authorName: string | null; interviewee: string | null;
  categoryId: string | null; categoryName: string | null; categorySlug: string | null;
  industrySector: string | null; businessStage: string | null;
  interviewFormat: string | null; founderRegion: string | null;
  successFactor: string | null; country: string | null;
  state: string | null; tags: Tag[];
};

type ApiResponse = {
  items: EntreChatItem[];
  totalItems: number; totalPages: number; page: number; limit: number;
  categories: { id: string; name: string; slug: string }[];
  industrySectors: string[]; businessStages: string[];
  interviewFormats: string[]; founderRegions: string[];
  successFactors: string[]; countries: string[];
  states: string[]; readingTimes: string[];
};

type SuggestionCandidate = {
  id: string; title: string; slug: string;
  publishedAt: string | null; authorName: string | null; categoryName: string | null;
};

type SearchSuggestion = {
  id: string; title: string; category: string;
  interviewee: string; date: string; slug: string; relevance: number;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function buildUrl(opts: {
  page?: number; limit?: number; search?: string;
  categorySlugs?: string[]; tagSlug?: string;
  industrySector?: string; businessStage?: string;
  interviewFormat?: string; founderRegion?: string;
  successFactor?: string; country?: string; state?: string;
  dateFrom?: string; dateTo?: string; readingTime?: string;
}): string {
  const p = new URLSearchParams({ contentType: "ENTRECHAT" });
  if (opts.page)                  p.set("page",            String(opts.page));
  if (opts.limit)                 p.set("limit",           String(opts.limit));
  if (opts.search)                p.set("search",          opts.search);
  if (opts.categorySlugs?.length) p.set("category",        opts.categorySlugs.join(","));
  if (opts.tagSlug)               p.set("tag",             opts.tagSlug);
  if (opts.industrySector)        p.set("industrySector",  opts.industrySector);
  if (opts.businessStage)         p.set("businessStage",   opts.businessStage);
  if (opts.interviewFormat)       p.set("interviewFormat", opts.interviewFormat);
  if (opts.founderRegion)         p.set("founderRegion",   opts.founderRegion);
  if (opts.successFactor)         p.set("successFactor",   opts.successFactor);
  if (opts.country)               p.set("country",         opts.country);
  if (opts.state)                 p.set("state",           opts.state);
  if (opts.dateFrom)              p.set("dateFrom",        opts.dateFrom);
  if (opts.dateTo)                p.set("dateTo",          opts.dateTo);
  if (opts.readingTime)           p.set("readingTime",     opts.readingTime);
  return `/api/content?${p}`;
}

function buildSuggestionsUrl(query: string): string {
  const p = new URLSearchParams({ contentType: "ENTRECHAT", suggestions: "1", q: query });
  return `/api/content?${p}`;
}

function rankSuggestions(results: SuggestionCandidate[], query: string): SearchSuggestion[] {
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
        category: r.categoryName ?? "Interview",
        interviewee: r.authorName ?? "",
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

export default function EntreChatPage() {

  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedCategorySlugs, setSelectedCategorySlugs]     = useState<string[]>([]);
  const [selectedTagSlug, setSelectedTagSlug]                 = useState("");
  const [selectedIndustrySector, setSelectedIndustrySector]   = useState("");
  const [selectedBusinessStage, setSelectedBusinessStage]     = useState("");
  const [selectedInterviewFormat, setSelectedInterviewFormat] = useState("");
  const [selectedFounderRegion, setSelectedFounderRegion]     = useState("");
  const [selectedSuccessFactor, setSelectedSuccessFactor]     = useState("");
  const [selectedCountry, setSelectedCountry]                 = useState("");
  const [selectedState, setSelectedState]                     = useState("");
  const [selectedReadingTimes, setSelectedReadingTimes]       = useState<string[]>([]);
  const [currentPage, setCurrentPage]                         = useState(1);
  const [searchQuery, setSearchQuery]                         = useState("");
  const [dateRange, setDateRange]                             = useState({ from: "", to: "" });
  const [selectedDateRange, setSelectedDateRange]             = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker]       = useState(false);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE);

  // ── Data state ────────────────────────────────────────────────────────────
  const [interviewItems, setInterviewItems]       = useState<EntreChatItem[]>([]);
  const [featuredInterview, setFeaturedInterview] = useState<EntreChatItem | null>(null);
  const [latestHeadlines, setLatestHeadlines]     = useState<EntreChatItem[]>([]);
  const [totalPages, setTotalPages]               = useState(1);
  const [totalItems, setTotalItems]               = useState(0);

  // ── Meta state ────────────────────────────────────────────────────────────
  const [categories, setCategories]                 = useState<{ id: string; name: string; slug: string }[]>([]);
  const [industrySectors, setIndustrySectors]       = useState<string[]>([]);
  const [businessStages, setBusinessStages]         = useState<string[]>([]);
  const [interviewFormats, setInterviewFormats]     = useState<string[]>([]);
  const [founderRegions, setFounderRegions]         = useState<string[]>([]);
  const [successFactors, setSuccessFactors]         = useState<string[]>([]);
  const [countries, setCountries]                   = useState<string[]>([]);
  const [states, setStates]                         = useState<string[]>([]);
  const [readingTimeBuckets, setReadingTimeBuckets] = useState<string[]>([]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading]   = useState(false);

  // ── Search suggestions ────────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ country?: string; state?: string; detected: boolean }>({ detected: false });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const searchRef      = useRef<HTMLDivElement>(null);
  const filterRef      = useRef<HTMLDivElement>(null);
  const filterAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const isFirstRender  = useRef(true);

  // ── Animation variants ────────────────────────────────────────────────────
  const bannerVariants: Variants = {
    hidden:  { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
  };
  const bannerSubtitleVariants: Variants = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
  };

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl({ page: 1, limit: ITEMS_PER_PAGE }));
        if (!res.ok) return;
        const data: ApiResponse = await res.json();
        setInterviewItems(data.items);
        setFeaturedInterview(data.items[0] ?? null);
        setLatestHeadlines(data.items.slice(0, 4));
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
        setCategories(data.categories        ?? []);
        setIndustrySectors(data.industrySectors  ?? []);
        setBusinessStages(data.businessStages    ?? []);
        setInterviewFormats(data.interviewFormats ?? []);
        setFounderRegions(data.founderRegions    ?? []);
        setSuccessFactors(data.successFactors    ?? []);
        setCountries(data.countries              ?? []);
        setStates(data.states                    ?? []);
        setReadingTimeBuckets(data.readingTimes  ?? []);
      } catch (err) {
        console.error("Init fetch error:", err);
      } finally {
        setIsInitialLoading(false);
      }
    })();
    detectUserLocation();
  }, []);

  // ── Filter fetch ──────────────────────────────────────────────────────────
  const fetchFilteredInterviews = useCallback(async () => {
    if (filterAbortRef.current) filterAbortRef.current.abort();
    filterAbortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const res = await fetch(
        buildUrl({
          page:            currentPage,
          limit:           ITEMS_PER_PAGE,
          search:          debouncedSearch        || undefined,
          categorySlugs:   selectedCategorySlugs.length ? selectedCategorySlugs : undefined,
          tagSlug:         selectedTagSlug        || undefined,
          industrySector:  selectedIndustrySector || undefined,
          businessStage:   selectedBusinessStage  || undefined,
          interviewFormat: selectedInterviewFormat || undefined,
          founderRegion:   selectedFounderRegion  || undefined,
          successFactor:   selectedSuccessFactor  || undefined,
          country:         selectedCountry        || undefined,
          state:           selectedState          || undefined,
          dateFrom:        dateRange.from         || undefined,
          dateTo:          dateRange.to           || undefined,
          readingTime:     selectedReadingTimes.length > 0 ? selectedReadingTimes.join(",") : undefined,
        }),
        { signal: filterAbortRef.current.signal }
      );
      if (!res.ok) throw new Error("Failed");
      const data: ApiResponse = await res.json();
      setInterviewItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
      if (data.categories?.length)      setCategories(data.categories);
      if (data.industrySectors?.length)  setIndustrySectors(data.industrySectors);
      if (data.businessStages?.length)   setBusinessStages(data.businessStages);
      if (data.interviewFormats?.length) setInterviewFormats(data.interviewFormats);
      if (data.founderRegions?.length)   setFounderRegions(data.founderRegions);
      if (data.successFactors?.length)   setSuccessFactors(data.successFactors);
      if (data.countries?.length)        setCountries(data.countries);
      if (data.states?.length)           setStates(data.states);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setInterviewItems([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [
    currentPage, debouncedSearch, selectedCategorySlugs, selectedTagSlug,
    selectedIndustrySector, selectedBusinessStage, selectedInterviewFormat,
    selectedFounderRegion, selectedSuccessFactor, selectedCountry, selectedState,
    dateRange, selectedReadingTimes,
  ]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchFilteredInterviews();
  }, [fetchFilteredInterviews]);

  // ── Suggestions ───────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();
    try {
      const res = await fetch(buildSuggestionsUrl(query), { signal: searchAbortRef.current.signal });
      if (!res.ok) return;
      const { results } = await res.json() as { results: SuggestionCandidate[] };
      const ranked = rankSuggestions(results, query);
      setSearchSuggestions(ranked);
      setShowSuggestions(ranked.length > 0);
    } catch (err: any) {
      if (err.name !== "AbortError") console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions(debouncedSearch);
    return () => { if (searchAbortRef.current) searchAbortRef.current.abort(); };
  }, [debouncedSearch, fetchSuggestions]);

  // ── Click-outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Date range ────────────────────────────────────────────────────────────
  const applyDateRangeFilter = (range: string) => {
    const now = new Date(); const from = new Date();
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

  // ── Location detection ────────────────────────────────────────────────────
  const detectUserLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setUserLocation({ country: data.country_name, state: data.region, detected: true });
      if (data.country_name) { setSelectedCountry(data.country_name); setCurrentPage(1); }
    } catch {
      setUserLocation({ detected: false });
    }
  };

  // ── Filter helpers ────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setSelectedCategorySlugs([]);
    setSelectedTagSlug(""); setSelectedIndustrySector(""); setSelectedBusinessStage("");
    setSelectedInterviewFormat(""); setSelectedFounderRegion(""); setSelectedSuccessFactor("");
    setSelectedCountry(""); setSelectedState(""); setSelectedReadingTimes([]);
    setDateRange({ from: "", to: "" }); setSelectedDateRange(""); setShowCustomDatePicker(false);
    setSearchQuery(""); setSearchSuggestions([]); setShowSuggestions(false);
    setCurrentPage(1); setIsFilterOpen(false);
  };

  const isAnyFilterActive = () =>
    selectedCategorySlugs.length > 0 || !!selectedTagSlug || !!selectedIndustrySector ||
    !!selectedBusinessStage || !!selectedInterviewFormat || !!selectedFounderRegion ||
    !!selectedSuccessFactor || !!selectedCountry || !!selectedState ||
    selectedReadingTimes.length > 0 || !!dateRange.from || !!dateRange.to || !!searchQuery;

  const activeFilterCount = [
    selectedCategorySlugs.length > 0, !!selectedTagSlug, !!selectedIndustrySector,
    !!selectedBusinessStage, !!selectedInterviewFormat, !!selectedFounderRegion,
    !!selectedSuccessFactor, !!selectedCountry, !!selectedState,
    selectedReadingTimes.length > 0, !!(dateRange.from || dateRange.to), !!searchQuery,
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

  // ── Loading screen ────────────────────────────────────────────────────────
  if (isInitialLoading) return (
    <main className="bg-background min-h-screen">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading interviews…</p>
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
            <Image src="/entrechat/Mobile-Entrechat.png" alt="EntreChat Banner" fill className="object-cover object-center" priority sizes="(max-width: 1024px) 100vw" />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image src="/entrechat/FinalEntrechatbanner.png" alt="EntreChat Banner" fill className="object-cover object-center" priority sizes="(min-width: 1024px) 100vw" />
          </div>
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-4 lg:px-3 xl:px-8 -mt-40 md:mt-[-200px] lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl xl:text-6xl font-bold">EntreChat Community</span>
                </h1>
              </motion.div>
              <motion.p initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                className="mt-2 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                Candid conversations with inspiring women entrepreneurs sharing real journeys and experiences.
                Discover challenges, strategies, and lessons that inform, inspire, and empower your own path.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURED + SIDEBAR ══════════════════════════════════════════════ */}
      <ScrollReveal direction="up" delay={0.2} threshold={0}>
        <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
          <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-6 sm:gap-8">

            {featuredInterview && (
              <ScrollReveal direction="left" delay={0.3} className="lg:col-span-2">
                <Link href={`/entrechat/${featuredInterview.slug}`}
                  className="block relative group bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-primary/10">
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
                    <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase shadow-lg">
                      Featured Interview
                    </span>
                  </div>
                  <div className="relative h-48 sm:h-64 lg:h-[340px] overflow-hidden bg-gradient-to-br from-muted to-secondary">
                    {featuredInterview.featuredImage ? (
                      <Image src={featuredInterview.featuredImage} alt={featuredInterview.title} fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700" priority sizes="(max-width: 1024px) 100vw, 66vw" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white/40 text-6xl font-display">{featuredInterview.interviewee?.charAt(0) ?? "E"}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-2">
                      {featuredInterview.categoryName && (
                        <span className="inline-flex items-center gap-1 px-2 sm:px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                          {getCategoryIcon(featuredInterview.categoryName)}{featuredInterview.categoryName}
                        </span>
                      )}
                      {featuredInterview.interviewee && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />{featuredInterview.interviewee}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">{featuredInterview.title}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-2 leading-relaxed line-clamp-3">{featuredInterview.summary || featuredInterview.excerpt}</p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 sm:h-4 sm:w-4" />{formatDate(featuredInterview.publishedAt)}</div>
                        {featuredInterview.readingTime && <div className="flex items-center gap-1"><Clock className="h-3 w-3 sm:h-4 sm:w-4" />{featuredInterview.readingTime} min read</div>}
                        {(featuredInterview.state || featuredInterview.country) && (
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3 sm:h-4 sm:w-4" />{featuredInterview.state || featuredInterview.country}</div>
                        )}
                      </div>
                      <Button className="bg-primary hover:bg-primary/90 group text-sm w-full sm:w-auto">
                        Read Interview <ExternalLink className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            )}

            <ScrollReveal direction="right" delay={0.4} className={!featuredInterview ? "lg:col-span-3" : ""}>
              <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 shadow-lg border border-border lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground">Trending Now</h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  <StaggerChildren>
                    <div className="space-y-3 sm:space-y-4">
                      {latestHeadlines.map((interview, i) => (
                        <motion.div key={interview.id} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                          <Link href={`/entrechat/${interview.slug}`}
                            className="block cursor-pointer pb-3 sm:pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-all duration-200">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-secondary">
                                {interview.featuredImage ? (
                                  <Image src={interview.featuredImage} alt={interview.title} fill className="object-cover" sizes="56px" loading="eager" />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                                    <span className="text-primary/40 text-lg font-display">{interview.interviewee?.charAt(0) ?? "E"}</span>
                                  </div>
                                )}
                                <div className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">{i + 1}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wide">
                                    {getCategoryIcon(interview.categoryName ?? "")}
                                    <span className="truncate max-w-[60px]">{(interview.categoryName ?? "Interview").split(" ")[0]}</span>
                                  </span>
                                  {interview.interviewee && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <User className="h-2.5 w-2.5" />{interview.interviewee.split(" ")[0]}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1.5 leading-snug line-clamp-2">{interview.title}</h4>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(interview.publishedAt)}</div>
                                  {interview.state && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate max-w-[60px]">{interview.state}</span></div>}
                                </div>
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
                    onClick={() => { clearAllFilters(); window.scrollTo({ top: document.getElementById("all-interviews-section")?.offsetTop ?? 0, behavior: "smooth" }); }}>
                    View All Interviews <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ScrollReveal>

      {/* ══ ALL INTERVIEWS GRID ═════════════════════════════════════════════ */}
      <ScrollFade delay={0.3}>
        <section id="all-interviews-section" className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-screen-xl mx-auto">

            {/* Header + Search + Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 sm:mb-12">
              <ScrollReveal direction="right" delay={0.2} className="min-w-0">
                <div>
                  <AnimatedText as="h2" delay={0.1}>
                    {selectedCategoryNames || "All Interviews"}
                    {debouncedSearch && <span className="text-lg sm:text-xl text-primary"> — Search: {debouncedSearch}</span>}
                  </AnimatedText>
                  <AnimatedText as="p" delay={0.2}>
                    {isFilterLoading ? (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Filtering…
                      </span>
                    ) : (
                      <>
                        {interviewItems.length} {interviewItems.length === 1 ? "interview" : "interviews"} shown
                        {totalItems !== interviewItems.length && ` (filtered from ${totalItems} total)`}
                        {debouncedSearch && ` matching "${debouncedSearch}"`}
                        {getDateRangeDisplayLabel() && ` • ${getDateRangeDisplayLabel()}`}
                      </>
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
                      <Input type="search" placeholder="Search interviews…" className="pl-10 pr-10 w-full bg-white"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (debouncedSearch.length >= 2 && searchSuggestions.length > 0) setShowSuggestions(true); }} />
                      {searchQuery && (
                        <button type="button" onClick={() => { setSearchQuery(""); setSearchSuggestions([]); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
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
                      FIX: w-full on mobile → left-0 anchors correctly.
                      sm+ → shrinks to button width, right-0 anchors correctly.
                  */}
                  <div className="relative w-full sm:w-auto" ref={filterRef}>
                    <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2"
                      onClick={() => setIsFilterOpen((v) => !v)}>
                      <SlidersHorizontal className="h-4 w-4" />Filters
                      {isAnyFilterActive() && (
                        <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">{activeFilterCount}</span>
                      )}
                    </Button>

                    <AnimatePresence>
                      {isFilterOpen && (
                        <motion.div
                          key="entrechat-filter-panel"
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
                            <h4 className="text-lg font-semibold text-foreground">Filter Interviews</h4>
                            <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
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

                          {/* Industry Sector */}
                          {industrySectors.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Industry / Sector</h5>
                              <div className="flex flex-wrap gap-2">
                                {industrySectors.map((sector) => (
                                  <button key={sector}
                                    onClick={() => { setSelectedIndustrySector(selectedIndustrySector === sector ? "" : sector); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedIndustrySector === sector ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <Building className="h-3 w-3 inline mr-1" />{sector}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Business Stage */}
                          {businessStages.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Business Stage</h5>
                              <div className="flex flex-wrap gap-2">
                                {businessStages.map((stage) => (
                                  <button key={stage}
                                    onClick={() => { setSelectedBusinessStage(selectedBusinessStage === stage ? "" : stage); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedBusinessStage === stage ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <TrendingUp className="h-3 w-3 inline mr-1" />{stage}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interview Format */}
                          {interviewFormats.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Interview Format</h5>
                              <div className="flex flex-wrap gap-2">
                                {interviewFormats.map((format) => (
                                  <button key={format}
                                    onClick={() => { setSelectedInterviewFormat(selectedInterviewFormat === format ? "" : format); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedInterviewFormat === format ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <Video className="h-3 w-3 inline mr-1" />{format}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Founder Region */}
                          {founderRegions.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Founder Region</h5>
                              <div className="flex flex-wrap gap-2">
                                {founderRegions.map((region) => (
                                  <button key={region}
                                    onClick={() => { setSelectedFounderRegion(selectedFounderRegion === region ? "" : region); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedFounderRegion === region ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <Globe className="h-3 w-3 inline mr-1" />{region}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Success Factor */}
                          {successFactors.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Success Factor</h5>
                              <div className="flex flex-wrap gap-2">
                                {successFactors.map((factor) => (
                                  <button key={factor}
                                    onClick={() => { setSelectedSuccessFactor(selectedSuccessFactor === factor ? "" : factor); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedSuccessFactor === factor ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <FileText className="h-3 w-3 inline mr-1" />{factor}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reading Time */}
                          {readingTimeBuckets.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Reading Time</h5>
                              <div className="flex flex-wrap gap-2">
                                {readingTimeBuckets.map((bucket) => (
                                  <button key={bucket}
                                    onClick={() => setSelectedReadingTimes((prev) => prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket])}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedReadingTimes.includes(bucket) ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <Clock className="h-3 w-3 inline mr-1" />{bucket}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Date Range */}
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Date Range</h5>
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
                                className="text-xs text-primary hover:text-primary/80 mt-2 transition-colors">Clear date range</button>
                            )}
                          </div>

                          {/* Country */}
                          {countries.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">Country</h5>
                              <div className="flex flex-wrap gap-2">
                                {countries.map((country) => (
                                  <button key={country}
                                    onClick={() => { setSelectedCountry(selectedCountry === country ? "" : country); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedCountry === country ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <Globe className="h-3 w-3 inline mr-1" />{country}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* State */}
                          {states.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">State / Region</h5>
                              <div className="flex flex-wrap gap-2">
                                {states.map((state) => (
                                  <button key={state}
                                    onClick={() => { setSelectedState(selectedState === state ? "" : state); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedState === state ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                                    <MapPin className="h-3 w-3 inline mr-1" />{state}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Location Detection */}
                          <div className="p-3 bg-secondary/30 rounded-lg mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Your Location</h5>
                              <button onClick={detectUserLocation} className="text-xs text-primary hover:text-primary/80 transition-colors">Detect</button>
                            </div>
                            {userLocation.detected ? (
                              <p className="text-xs text-muted-foreground">
                                Showing interviews from{" "}
                                <span className="font-medium text-foreground">
                                  {userLocation.country}{userLocation.state && ` • ${userLocation.state}`}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Click detect to filter by your location</p>
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
                                {/* Multi-category chips */}
                                {selectedCategorySlugs.map((slug) => {
                                  const cat = categories.find((c) => c.slug === slug);
                                  return cat ? (
                                    <Chip key={slug} color="primary" icon={<CalendarDays className="h-3 w-3" />}
                                      onRemove={() => { setSelectedCategorySlugs((prev) => prev.filter((s) => s !== slug)); setCurrentPage(1); }}>
                                      {cat.name}
                                    </Chip>
                                  ) : null;
                                })}
                                {selectedTagSlug && <Chip color="purple" icon={<FileText className="h-3 w-3" />} onRemove={() => { setSelectedTagSlug(""); setCurrentPage(1); }}>#{selectedTagSlug}</Chip>}
                                {selectedIndustrySector && <Chip color="blue" icon={<Building className="h-3 w-3" />} onRemove={() => { setSelectedIndustrySector(""); setCurrentPage(1); }}>{selectedIndustrySector}</Chip>}
                                {selectedBusinessStage && <Chip color="green" icon={<TrendingUp className="h-3 w-3" />} onRemove={() => { setSelectedBusinessStage(""); setCurrentPage(1); }}>{selectedBusinessStage}</Chip>}
                                {selectedInterviewFormat && <Chip color="purple" icon={<Video className="h-3 w-3" />} onRemove={() => { setSelectedInterviewFormat(""); setCurrentPage(1); }}>{selectedInterviewFormat}</Chip>}
                                {selectedFounderRegion && <Chip color="purple" icon={<Globe className="h-3 w-3" />} onRemove={() => { setSelectedFounderRegion(""); setCurrentPage(1); }}>{selectedFounderRegion}</Chip>}
                                {selectedSuccessFactor && <Chip color="amber" icon={<FileText className="h-3 w-3" />} onRemove={() => { setSelectedSuccessFactor(""); setCurrentPage(1); }}>{selectedSuccessFactor}</Chip>}
                                {selectedCountry && <Chip color="purple" icon={<Globe className="h-3 w-3" />} onRemove={() => { setSelectedCountry(""); setCurrentPage(1); }}>{selectedCountry}</Chip>}
                                {selectedState && <Chip color="amber" icon={<MapPin className="h-3 w-3" />} onRemove={() => { setSelectedState(""); setCurrentPage(1); }}>{selectedState}</Chip>}
                                {selectedReadingTimes.map((bucket) => (
                                  <Chip key={bucket} color="blue" icon={<Clock className="h-3 w-3" />} onRemove={() => setSelectedReadingTimes((prev) => prev.filter((b) => b !== bucket))}>{bucket}</Chip>
                                ))}
                                {selectedDateRange && selectedDateRange !== "custom" && (
                                  <Chip color="green" icon={<Calendar className="h-3 w-3" />} onRemove={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); }}>
                                    {predefinedDateRanges.find((r) => r.value === selectedDateRange)?.label}
                                  </Chip>
                                )}
                                {searchQuery && <Chip color="amber" icon={<Search className="h-3 w-3" />} onRemove={() => { setSearchQuery(""); setSearchSuggestions([]); setShowSuggestions(false); }}>Search: {searchQuery}</Chip>}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </ScrollReveal>
            </div>

            {/* Grid / Skeleton / Empty */}
            {isFilterLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : interviewItems.length === 0 ? (
              <ScrollFade delay={0.4}>
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No interviews found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {debouncedSearch ? `No interviews found matching "${debouncedSearch}".` : "No interviews match the current filters."}
                  </p>
                  <Button onClick={clearAllFilters} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">View All Interviews</Button>
                </div>
              </ScrollFade>
            ) : (
              <>
                <StaggerChildren>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {interviewItems.map((interview, index) => (
                      <motion.div key={interview.id} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
                        <Link href={`/entrechat/${interview.slug}`}
                          className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 border border-border flex flex-col h-full">
                          <div className="relative h-40 sm:h-44 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                            {interview.featuredImage ? (
                              <Image src={interview.featuredImage} alt={interview.title} fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                loading={index < 4 ? "eager" : "lazy"} />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                                <span className="text-white/40 text-5xl font-display">{interview.interviewee?.charAt(0) ?? "E"}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 sm:p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
                                {getCategoryIcon(interview.categoryName ?? "")}{(interview.categoryName ?? "Interview").split(" & ")[0]}
                              </span>
                              {interview.readingTime && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{interview.readingTime} min</span>}
                            </div>
                            {interview.interviewee && (
                              <div className="flex items-center gap-1 mb-2">
                                <span className="text-xs font-medium text-foreground flex items-center gap-1"><User className="h-3 w-3" />{interview.interviewee}</span>
                              </div>
                            )}
                            <h3 className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">{interview.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {interview.industrySector && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">{interview.industrySector}</span>}
                              {interview.businessStage && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]">{interview.businessStage}</span>}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 line-clamp-2 leading-relaxed flex-grow">{interview.summary || interview.excerpt}</p>
                            {interview.tags && interview.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {interview.tags.slice(0, 2).map((tag) => (
                                  <button key={tag.id} onClick={(e) => { e.preventDefault(); setSelectedTagSlug(tag.slug); setCurrentPage(1); }}
                                    className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors">
                                    #{tag.name}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border mt-auto">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{formatDate(interview.publishedAt)}</div>
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 sm:mt-12 pt-8 border-t border-border">
                      <p className="text-sm text-muted-foreground">Showing page {currentPage} of {totalPages}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1">
                          <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                            p === "…" ? (
                              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                            ) : (
                              <motion.div key={p} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button variant={currentPage === p ? "default" : "outline"} size="sm" className="w-10 h-10 p-0" onClick={() => handlePageChange(p as number)}>{p}</Button>
                              </motion.div>
                            )
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">
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