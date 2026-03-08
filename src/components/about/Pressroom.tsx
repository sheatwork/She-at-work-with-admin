// /app/about/press-room/page.tsx
/*eslint-disable @typescript-eslint/no-explicit-any */
/*eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import Cta from "@/components/common/Cta";
import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { Button } from "@/components/ui/button";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Calendar, Clock, TrendingUp, Search, X, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";

// Define types for API response
interface ApiTag {
  id: string;
  name: string;
  slug: string;
}

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
  author: { name: string; role?: string };
  image: string;
  fullContent: string;
  modifiedDate?: string;
  slug: string;
  hasValidContent: boolean;
  tags: ApiTag[];
}

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

// Helper functions
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Date unavailable';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Date unavailable';
  }
};

// Clean HTML tags from text
const cleanText = (text: string | null): string => {
  if (!text) return '';
  
  // Remove HTML tags
  const clean = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&\w+;/g, ' ') // Replace other HTML entities
    .trim();
  
  return clean;
};

const extractExcerpt = (summary: string | null, maxLength: number = 150): string => {
  if (!summary) return 'No excerpt available';
  
  // Clean the summary
  const cleanContent = cleanText(summary);
  
  if (cleanContent.length === 0) {
    return 'Press release available';
  }
  
  return cleanContent.length <= maxLength ? cleanContent : cleanContent.substring(0, maxLength) + '...';
};

const calculateReadTime = (readingTime: number | null): string => {
  if (!readingTime) return '1 min read';
  return `${Math.max(1, readingTime)} min read`;
};

// Helper to get image URL from press item
const getImageUrl = (item: PressItem): string => {
  // First, try featured image
  if (item.featuredImage) {
    return item.featuredImage;
  }
  
  // Fallback to default placeholder
  return '/images/press-placeholder.jpg';
};

const ITEMS_PER_PAGE = 12;

// URL builder function
function buildUrl(opts: {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const p = new URLSearchParams({ contentType: "PRESS" });
  if (opts.page) p.set("page", String(opts.page));
  if (opts.limit) p.set("limit", String(opts.limit));
  if (opts.search) p.set("search", opts.search);
  if (opts.categorySlug) p.set("category", opts.categorySlug);
  if (opts.tagSlug) p.set("tag", opts.tagSlug);
  if (opts.dateFrom) p.set("dateFrom", opts.dateFrom);
  if (opts.dateTo) p.set("dateTo", opts.dateTo);
  return `/api/content?${p}`;
}

export default function PressRoomPage() {
  const [processedPress, setProcessedPress] = useState<ProcessedPressItem[]>([]);
  const [allItems, setAllItems] = useState<PressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredPress, setFilteredPress] = useState<ProcessedPressItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState<{ [key: string]: boolean }>({});
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filter states
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [selectedTagSlug, setSelectedTagSlug] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  
  // UI states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Refs
  const filterRef = useRef<HTMLDivElement>(null);
  const filterAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Initial fetch
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch(buildUrl({ page: 1, limit: ITEMS_PER_PAGE }));
        if (!res.ok) throw new Error('Failed to fetch');
        const data: ApiResponse = await res.json();

        setAllItems(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
        setCategories(data.categories ?? []);

        // Process the items
        const processed = data.items.map((item: PressItem) => ({
          id: item.id,
          title: cleanText(item.title) || 'Untitled Press Release',
          excerpt: extractExcerpt(item.summary),
          date: formatDate(item.publishedAt),
          readTime: calculateReadTime(item.readingTime),
          author: { name: item.authorName || 'She at Work', role: "Contributor" },
          image: getImageUrl(item),
          fullContent: item.summary || '',
          slug: item.slug,
          hasValidContent: true,
          tags: item.tags || [],
        }));

        setProcessedPress(processed);
        setFilteredPress(processed);
      } catch (error) {
        console.error('Error fetching press data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch on filter/page change
  const fetchFilteredPress = useCallback(async () => {
    if (filterAbortRef.current) filterAbortRef.current.abort();
    filterAbortRef.current = new AbortController();
    setIsFilterLoading(true);

    try {
      const res = await fetch(
        buildUrl({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch || undefined,
          categorySlug: selectedCategorySlug || undefined,
          tagSlug: selectedTagSlug || undefined,
        }),
        { signal: filterAbortRef.current.signal }
      );
      
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ApiResponse = await res.json();
      
      setAllItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
      
      // Update categories if server returned fresher data
      if (data.categories?.length) setCategories(data.categories);

      // Process the items
      const processed = data.items.map((item: PressItem) => ({
        id: item.id,
        title: cleanText(item.title) || 'Untitled Press Release',
        excerpt: extractExcerpt(item.summary),
        date: formatDate(item.publishedAt),
        readTime: calculateReadTime(item.readingTime),
        author: { name: item.authorName || 'She at Work', role: "Contributor" },
        image: getImageUrl(item),
        fullContent: item.summary || '',
        slug: item.slug,
        hasValidContent: true,
        tags: item.tags || [],
      }));

      setProcessedPress(processed);
      setFilteredPress(processed);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Filter fetch error:", err);
      setProcessedPress([]);
      setFilteredPress([]);
    } finally {
      setIsFilterLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategorySlug, selectedTagSlug]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchFilteredPress();
  }, [fetchFilteredPress]);

  // Click outside handler for filter
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const featuredPress = filteredPress.length > 0 ? filteredPress[0] : null;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentPosts = filteredPress;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageLoad = (id: string) => {
    setImagesLoaded(prev => ({ ...prev, [id]: true }));
  };

  const clearAllFilters = () => {
    setSelectedCategorySlug("");
    setSelectedTagSlug("");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () => {
    return !!selectedCategorySlug || !!selectedTagSlug || !!searchQuery;
  };

  const activeFilterCount = [
    !!selectedCategorySlug,
    !!selectedTagSlug,
    !!searchQuery,
  ].filter(Boolean).length;

  const selectedCategory = categories.find((c) => c.slug === selectedCategorySlug);

  if (isLoading) {
    return (
      <main className="bg-background min-h-screen">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-20"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-primary"
          />
        </motion.div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-28 pb-2 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

        <div className="relative w-full mx-auto text-center text-white px-4">
          <ScrollFade>
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
            >
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

      {/* Featured Press Section */}
      {featuredPress && !isFilterLoading && (
        <ScrollFade>
          <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-screen-xl mx-auto">
              <motion.div 
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 sm:p-8 mb-8"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <motion.div 
                    variants={fadeInLeft}
                    className="lg:w-1/2"
                  >
                    <div className="relative h-64 sm:h-72 lg:h-96 rounded-xl overflow-hidden">
                      {!imagesLoaded[featuredPress.id] && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full"
                      >
                        <Image
                          src={featuredPress.image}
                          alt={featuredPress.title}
                          fill
                          className={`object-cover transition-opacity duration-300 ${
                            imagesLoaded[featuredPress.id] ? 'opacity-100' : 'opacity-0'
                          }`}
                          unoptimized={featuredPress.image.startsWith('http')}
                          onLoad={() => handleImageLoad(featuredPress.id)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                          priority={true}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    variants={fadeInRight}
                    className="lg:w-1/2 flex flex-col justify-center"
                  >
                    <motion.div 
                      variants={scaleIn}
                      className="mb-4"
                    >
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Featured
                      </span>
                    </motion.div>
                    
                    <AnimatedText 
                      as="h2" 
                      className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4"
                    >
                      {featuredPress.title}
                    </AnimatedText>
                    
                    <AnimatedText delay={0.1} className="text-muted-foreground mb-6 line-clamp-3">
                      {featuredPress.excerpt}
                    </AnimatedText>
                    
                    <motion.div 
                      variants={fadeInUp}
                      className="flex items-center justify-between mb-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{featuredPress.date}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{featuredPress.readTime}</span>
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link href={`/about/press-room/${featuredPress.slug}`}>
                        <Button className="w-full sm:w-auto">
                          Read Full Release
                          <ArrowRight className="ml-2 h-4 w-4" />
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

      {/* All Press Releases with Search */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-screen-xl mx-auto">
          <ScrollFade>
            <motion.div 
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
            >
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                  {selectedCategory ? selectedCategory.name : "All Press Releases"}
                  {debouncedSearch && <span className="text-primary ml-2">— Search: {debouncedSearch}</span>}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isFilterLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Filtering...
                    </span>
                  ) : (
                    <>
                      {totalItems} {totalItems === 1 ? 'release' : 'releases'} found
                      {debouncedSearch && ` matching "${debouncedSearch}"`}
                    </>
                  )}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                {/* Search Input */}
                <motion.div 
                  variants={scaleIn}
                  className="w-full sm:w-auto relative"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search press releases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pl-10 pr-10 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setDebouncedSearch("");
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* Filter Button */}
                <div className="relative w-full sm:w-auto" ref={filterRef}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto flex items-center gap-2"
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {isAnyFilterActive() && (
                        <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </motion.div>

                  {/* Filter Dropdown */}
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-1 w-80 bg-white border border-border rounded-lg shadow-xl z-50 max-h-[80vh] overflow-y-auto p-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-foreground">Filter Press Releases</h4>
                      </div>

                      {/* Category Filter */}
                      {categories.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
                          <select
                            value={selectedCategorySlug}
                            onChange={(e) => {
                              setSelectedCategorySlug(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.slug}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Active Filters */}
                      {isAnyFilterActive() && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="pt-4 mt-2 border-t border-border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-foreground">Active Filters</h5>
                            <button
                              onClick={clearAllFilters}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                            >
                              <X className="h-3 w-3" /> Clear All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedCategory && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                {selectedCategory.name}
                                <button
                                  onClick={() => setSelectedCategorySlug("")}
                                  className="hover:text-primary/80"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                            {searchQuery && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                Search: {searchQuery}
                                <button
                                  onClick={() => {
                                    setSearchQuery("");
                                    setDebouncedSearch("");
                                  }}
                                  className="hover:text-primary/80"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </ScrollFade>

          {isFilterLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden shadow-md border border-border animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                    <div className="pt-4 border-t">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPress.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No press releases found matching your search.</p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                >
                  Clear All Filters
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <>
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {currentPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    variants={fadeInUp}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Link
                      href={`/about/press-room/${post.slug}`}
                      className="group bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border flex flex-col h-full"
                    >
                      <div className="relative h-48 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                        {!imagesLoaded[post.id] && (
                          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                        )}
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                          className="w-full h-full"
                        >
                          <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            className={`object-cover transition-opacity duration-300 ${
                              imagesLoaded[post.id] ? 'opacity-100' : 'opacity-0'
                            }`}
                            unoptimized={post.image.startsWith('http')}
                            onLoad={() => handleImageLoad(post.id)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            loading={index < 6 ? "eager" : "lazy"}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </motion.div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <h3 className="text-base font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">
                          {post.excerpt}
                        </p>
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-0.5 text-[10px] bg-secondary text-muted-foreground rounded-full"
                              >
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
                              <Calendar className="h-3 w-3" />
                              <span>{post.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{post.readTime}</span>
                            </div>
                          </div>
                          <motion.div 
                            className="inline-flex items-center gap-1 text-sm text-primary group-hover:text-accent transition-all"
                            whileHover={{ x: 5 }}
                          >
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
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-border"
                >
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} releases
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-3"
                      >
                        Previous
                      </Button>
                    </motion.div>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-10 h-10 p-0"
                          >
                            {pageNum}
                          </Button>
                        </motion.div>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="flex items-center px-2">...</span>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="w-10 h-10 p-0"
                          >
                            {totalPages}
                          </Button>
                        </motion.div>
                      </>
                    )}

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-3"
                      >
                        Next
                      </Button>
                    </motion.div>
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