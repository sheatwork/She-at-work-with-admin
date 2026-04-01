/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AnimatedText, ScrollFade, StaggerChildren } from "@/components/common/ScrollFade";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { SkeletonCard } from "@/components/content/SkeletonCard";
import { SearchSuggestions } from "@/components/content/SearchSuggestions";

import type {
  BaseContentItem, BaseApiResponse, Category, ContentPageConfig,
  EntreChatApiResponse, EntreChatItem, SearchSuggestion,
} from "./types";
import { FilterPanel, FilterState } from "./Filterpanel";
import { useDebounce } from "./Usedebounce";
import { buildUrl, rankSuggestions } from "./utils";
import { ContentCard } from "./Contentcard";
import { ContentPagination } from "./Contentpagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE  = 12;
const DEBOUNCE_MS     = 500;

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  config:              ContentPageConfig;
  initialItems:        BaseContentItem[];
  initialTotal:        number;
  initialPages:        number;
  categories:          Category[];
  readingTimeBuckets:  string[];
  // EntreChat extras
  initialIndustrySectors?:  string[];
  initialBusinessStages?:   string[];
  initialInterviewFormats?: string[];
  initialFounderRegions?:   string[];
  initialSuccessFactors?:   string[];
  initialCountries?:        string[];
  initialStates?:           string[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentGridClient({
  config,
  initialItems,
  initialTotal,
  initialPages,
  categories:          initialCategories,
  readingTimeBuckets:  initialBuckets,
  initialIndustrySectors  = [],
  initialBusinessStages   = [],
  initialInterviewFormats = [],
  initialFounderRegions   = [],
  initialSuccessFactors   = [],
  initialCountries        = [],
  initialStates           = [],
}: Props) {

  const isEntreChat = config.contentType === "ENTRECHAT";

  // ── Data ──────────────────────────────────────────────────────────────────
  const [items,      setItems]      = useState<BaseContentItem[]>(initialItems);
  const [totalPages, setTotalPages] = useState(initialPages);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [readingTimeBuckets, setReadingTimeBuckets] = useState<string[]>(initialBuckets);

  // EntreChat meta
  const [industrySectors,  setIndustrySectors]  = useState<string[]>(initialIndustrySectors);
  const [businessStages,   setBusinessStages]   = useState<string[]>(initialBusinessStages);
  const [interviewFormats, setInterviewFormats] = useState<string[]>(initialInterviewFormats);
  const [founderRegions,   setFounderRegions]   = useState<string[]>(initialFounderRegions);
  const [successFactors,   setSuccessFactors]   = useState<string[]>(initialSuccessFactors);
  const [countries,        setCountries]        = useState<string[]>(initialCountries);
  const [states,           setStates]           = useState<string[]>(initialStates);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterState, setFilterState] = useState<FilterState>({
    selectedCategorySlugs:   [],
    tagInput:                "",
    selectedReadingTimes:    [],
    dateRange:               { from: "", to: "" },
    selectedDateRange:       "",
    showCustomDatePicker:    false,
    searchQuery:             "",
    selectedIndustrySector:  "",
    selectedBusinessStage:   "",
    selectedInterviewFormat: "",
    selectedFounderRegion:   "",
    selectedSuccessFactor:   "",
    selectedCountry:         "",
    selectedState:           "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // ── Search suggestions ────────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ country?: string; state?: string; detected: boolean }>({ detected: false });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const searchRef      = useRef<HTMLDivElement>(null);
  const filterRef      = useRef<HTMLDivElement>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const isFirstRender  = useRef(true);
  const prevKeyRef     = useRef("");

  // ── Debounced values ──────────────────────────────────────────────────────
  const debouncedSearch  = useDebounce(filterState.searchQuery, DEBOUNCE_MS);
  const debouncedTag     = useDebounce(filterState.tagInput,    DEBOUNCE_MS);

  // ── Filter key (stable serialisation for change detection) ───────────────
  const buildFilterKey = useCallback(() => JSON.stringify({
    currentPage,
    search:          debouncedSearch,
    category:        filterState.selectedCategorySlugs.join(","),
    tag:             debouncedTag,
    readingTimes:    filterState.selectedReadingTimes.join(","),
    dateFrom:        filterState.dateRange.from,
    dateTo:          filterState.dateRange.to,
    industrySector:  filterState.selectedIndustrySector,
    businessStage:   filterState.selectedBusinessStage,
    interviewFormat: filterState.selectedInterviewFormat,
    founderRegion:   filterState.selectedFounderRegion,
    successFactor:   filterState.selectedSuccessFactor,
    country:         filterState.selectedCountry,
    state:           filterState.selectedState,
  }), [currentPage, debouncedSearch, debouncedTag, filterState]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchFiltered = useCallback(async () => {
    const key = buildFilterKey();
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const readingTime = filterState.selectedReadingTimes.length > 0
        ? filterState.selectedReadingTimes.join(",")
        : undefined;

      const url = buildUrl({
        contentType:     config.contentType,
        page:            currentPage,
        limit:           ITEMS_PER_PAGE,
        search:          debouncedSearch.length >= 2 ? debouncedSearch : undefined,
        categorySlugs:   filterState.selectedCategorySlugs.length ? filterState.selectedCategorySlugs : undefined,
        tagSlug:         debouncedTag || undefined,
        dateFrom:        filterState.dateRange.from || undefined,
        dateTo:          filterState.dateRange.to || undefined,
        readingTime,
        ...(isEntreChat && {
          industrySector:  filterState.selectedIndustrySector  || undefined,
          businessStage:   filterState.selectedBusinessStage   || undefined,
          interviewFormat: filterState.selectedInterviewFormat || undefined,
          founderRegion:   filterState.selectedFounderRegion   || undefined,
          successFactor:   filterState.selectedSuccessFactor   || undefined,
          country:         filterState.selectedCountry         || undefined,
          state:           filterState.selectedState           || undefined,
        }),
      });

      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error("Failed");
      const data: BaseApiResponse | EntreChatApiResponse = await res.json();

      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
      if (data.categories?.length)   setCategories(data.categories);
      if (data.readingTimes?.length) setReadingTimeBuckets(data.readingTimes);

      if (isEntreChat) {
        const ec = data as EntreChatApiResponse;
        if (ec.industrySectors?.length)  setIndustrySectors(ec.industrySectors);
        if (ec.businessStages?.length)   setBusinessStages(ec.businessStages);
        if (ec.interviewFormats?.length) setInterviewFormats(ec.interviewFormats);
        if (ec.founderRegions?.length)   setFounderRegions(ec.founderRegions);
        if (ec.successFactors?.length)   setSuccessFactors(ec.successFactors);
        if (ec.countries?.length)        setCountries(ec.countries);
        if (ec.states?.length)           setStates(ec.states);
      }

      // Suggestions
      if (data.suggestionCandidates?.length && debouncedSearch.length >= 2) {
        const ranked = rankSuggestions(data.suggestionCandidates, debouncedSearch);
        setSearchSuggestions(ranked);
        setShowSuggestions(ranked.length > 0);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }

    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setItems([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [buildFilterKey, config.contentType, currentPage, debouncedSearch, debouncedTag,
      filterState, isEntreChat]);

  // ── Trigger fetch when filters change ─────────────────────────────────────
 useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  fetchFiltered();
  return () => { abortRef.current?.abort(); };
}, [
  currentPage, debouncedSearch, debouncedTag,
  filterState.selectedCategorySlugs, filterState.selectedReadingTimes,
  filterState.dateRange.from, filterState.dateRange.to,
  filterState.selectedIndustrySector, filterState.selectedBusinessStage,
  filterState.selectedInterviewFormat, filterState.selectedFounderRegion,
  filterState.selectedSuccessFactor, filterState.selectedCountry, filterState.selectedState,
  fetchFiltered, isEntreChat,
]);
  // ── Clear suggestions when search cleared ─────────────────────────────────
  useEffect(() => {
    if (debouncedSearch.length < 2) { setSearchSuggestions([]); setShowSuggestions(false); }
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

  // ── Date range preset ─────────────────────────────────────────────────────
  const applyDateRangePreset = (range: string) => {
    if (range === "custom") {
      setFilterState((s) => ({ ...s, selectedDateRange: range, showCustomDatePicker: true }));
      return;
    }
    const now = new Date(); const from = new Date();
    switch (range) {
      case "24h":     from.setDate(now.getDate() - 1);    break;
      case "week":    from.setDate(now.getDate() - 7);    break;
      case "month":   from.setMonth(now.getMonth() - 1);  break;
      case "3months": from.setMonth(now.getMonth() - 3);  break;
    }
    setFilterState((s) => ({
      ...s,
      selectedDateRange:    range,
      showCustomDatePicker: false,
      dateRange: { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] },
    }));
    setCurrentPage(1);
  };

  // ── Clear all filters ─────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setFilterState({
      selectedCategorySlugs: [], tagInput: "", selectedReadingTimes: [],
      dateRange: { from: "", to: "" }, selectedDateRange: "", showCustomDatePicker: false,
      searchQuery: "",
      selectedIndustrySector: "", selectedBusinessStage: "", selectedInterviewFormat: "",
      selectedFounderRegion: "", selectedSuccessFactor: "", selectedCountry: "", selectedState: "",
    });
    setCurrentPage(1);
    setIsFilterOpen(false);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    prevKeyRef.current = "";
  };

  // ── Location detection (EntreChat) ────────────────────────────────────────
  const detectUserLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setUserLocation({ country: data.country_name, state: data.region, detected: true });
      if (data.country_name) {
        setFilterState((s) => ({ ...s, selectedCountry: data.country_name }));
        setCurrentPage(1);
      }
    } catch {
      setUserLocation({ detected: false });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeFilterCount = [
    filterState.selectedCategorySlugs.length > 0,
    !!filterState.tagInput,
    filterState.selectedReadingTimes.length > 0,
    !!(filterState.dateRange.from || filterState.dateRange.to),
    !!filterState.searchQuery,
    ...(isEntreChat ? [
      !!filterState.selectedIndustrySector, !!filterState.selectedBusinessStage,
      !!filterState.selectedInterviewFormat, !!filterState.selectedFounderRegion,
      !!filterState.selectedSuccessFactor, !!filterState.selectedCountry, !!filterState.selectedState,
    ] : []),
  ].filter(Boolean).length;

  const selectedCategoryNames = filterState.selectedCategorySlugs
    .map((slug) => categories.find((c) => c.slug === slug)?.name)
    .filter(Boolean).join(", ");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollFade delay={0.3}>
      <section id={config.gridSectionId} className="px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="max-w-screen-xl mx-auto">

          {/* Header row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 sm:mb-12">
            <ScrollReveal direction="right" delay={0.2} className="min-w-0">
              <div>
                <AnimatedText as="h2" delay={0.1}>
                  {selectedCategoryNames || config.gridTitle}
                  {debouncedSearch.length >= 2 && (
                    <span className="text-lg sm:text-xl text-primary"> — Search: {debouncedSearch}</span>
                  )}
                </AnimatedText>
                <AnimatedText as="p" delay={0.2}>
                  {isFilterLoading ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Filtering…
                    </span>
                  ) : (
                    <>
                      {totalItems} {totalItems === 1 ? "article" : "articles"} found
                      {debouncedSearch.length >= 2 && ` matching "${debouncedSearch}"`}
                    </>
                  )}
                </AnimatedText>
              </div>
            </ScrollReveal>

            {/* Search + Filter */}
            <ScrollReveal direction="left" delay={0.3} className="flex-shrink-0">
              <div className="flex flex-row items-center gap-2 w-full lg:w-auto">

                {/* Search */}
                <div className="relative w-full sm:w-56 lg:w-64" ref={searchRef}>
                  <form onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); }}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black z-10" />
                    <Input
                      type="search"
                      placeholder={config.searchPlaceholder}
                      className="pl-10 pr-10 w-full bg-white"
                      value={filterState.searchQuery}
                      onChange={(e) => setFilterState((s) => ({ ...s, searchQuery: e.target.value }))}
                      onFocus={() => {
                        if (debouncedSearch.length >= 2 && searchSuggestions.length > 0)
                          setShowSuggestions(true);
                      }}
                    />
                    {filterState.searchQuery && (
                      <button type="button"
                        onClick={() => setFilterState((s) => ({ ...s, searchQuery: "" }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        <Search className="h-4 w-4 text-black" />
                      </button>
                    )}
                  </form>
                  <SearchSuggestions
                    suggestions={searchSuggestions}
                    onSelect={(title) => { setFilterState((s) => ({ ...s, searchQuery: title })); setShowSuggestions(false); }}
                    searchQuery={debouncedSearch}
                    isVisible={showSuggestions}
                    onClose={() => setShowSuggestions(false)}
                  />
                </div>

                {/* Filter button */}
                <div className="relative w-full sm:w-auto" ref={filterRef}>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto flex items-center justify-center gap-2"
                    onClick={() => setIsFilterOpen((v) => !v)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>

                  <FilterPanel
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                    state={filterState}
                    categories={categories}
                    readingTimeBuckets={readingTimeBuckets}
                    config={config}
                    onClearAll={clearAllFilters}
                    setCategorySlugs={(v) => { setFilterState((s) => ({ ...s, selectedCategorySlugs: v })); setCurrentPage(1); }}
                    setTagInput={(v) => { setFilterState((s) => ({ ...s, tagInput: v })); setCurrentPage(1); }}
                    setReadingTimes={(v) => { setFilterState((s) => ({ ...s, selectedReadingTimes: v })); setCurrentPage(1); }}
                    setDateRange={(v) => { setFilterState((s) => ({ ...s, dateRange: v })); setCurrentPage(1); }}
                    setSelectedDateRange={(v) => setFilterState((s) => ({ ...s, selectedDateRange: v }))}
                    setShowCustomDate={(v) => setFilterState((s) => ({ ...s, showCustomDatePicker: v }))}
                    onDateRangePreset={applyDateRangePreset}
                    // EntreChat
                    industrySectors={industrySectors}
                    businessStages={businessStages}
                    interviewFormats={interviewFormats}
                    founderRegions={founderRegions}
                    successFactors={successFactors}
                    countries={countries}
                    states={states}
                    onSetIndustrySector={(v) => { setFilterState((s) => ({ ...s, selectedIndustrySector: v })); setCurrentPage(1); }}
                    onSetBusinessStage={(v) => { setFilterState((s) => ({ ...s, selectedBusinessStage: v })); setCurrentPage(1); }}
                    onSetInterviewFormat={(v) => { setFilterState((s) => ({ ...s, selectedInterviewFormat: v })); setCurrentPage(1); }}
                    onSetFounderRegion={(v) => { setFilterState((s) => ({ ...s, selectedFounderRegion: v })); setCurrentPage(1); }}
                    onSetSuccessFactor={(v) => { setFilterState((s) => ({ ...s, selectedSuccessFactor: v })); setCurrentPage(1); }}
                    onSetCountry={(v) => { setFilterState((s) => ({ ...s, selectedCountry: v })); setCurrentPage(1); }}
                    onSetState={(v) => { setFilterState((s) => ({ ...s, selectedState: v })); setCurrentPage(1); }}
                    userLocation={userLocation}
                    onDetectLocation={isEntreChat ? detectUserLocation : undefined}
                  />
                </div>

              </div>
            </ScrollReveal>
          </div>

          {/* Grid */}
          {isFilterLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <ScrollFade delay={0.4}>
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">
                  No articles found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {config.emptyMessage}
                </p>
                <Button onClick={clearAllFilters}
                  className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                  {config.viewAllLabel}
                </Button>
              </div>
            </ScrollFade>
          ) : (
            <>
              <StaggerChildren>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      variants={{
                        hidden:  { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                      }}
                    >
                      <ContentCard
                        item={item as BaseContentItem | EntreChatItem}
                        href={`/${config.slug}/${item.slug}`}
                        index={index}
                        onTagClick={(slug) => {
                          setFilterState((s) => ({ ...s, tagInput: slug }));
                          setCurrentPage(1);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </StaggerChildren>

              <ContentPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}

        </div>
      </section>
    </ScrollFade>
  );
}