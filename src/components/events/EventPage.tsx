"use client";

import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openEventRegistrationEmail } from "@/hooks/Emailutils";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  IndianRupee,
  Mail,
  Search,
  SlidersHorizontal,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Cta from "../common/Cta";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content?: string;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: { id: string; name: string; slug: string }[];
}

interface ApiResponse {
  items: ApiContentItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  categories: { id: string; name: string; slug: string }[];
  readingTimes: string[];
}

interface ProcessedEvent {
  id: string;
  category: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  location: string;
  format: string;
  price: string;
  image: string;
  fullContent: string;
  slug: string;
  featured: boolean;
  month: string;
  day: string;
  postDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE  = 12;
const SEARCH_DEBOUNCE = 500;

const eventCategoryNames = [
  "Conferences", "Workshops", "Webinars", "Networking",
  "Seminars", "Forums", "Launches", "Awards", "Festivals", "Other Events",
];

const categorySlugMap: Record<string, string> = {
  "Conferences":  "conferences",
  "Workshops":    "workshops",
  "Webinars":     "webinars",
  "Networking":   "networking",
  "Seminars":     "seminars",
  "Forums":       "forums",
  "Launches":     "launches",
  "Awards":       "awards",
  "Festivals":    "festivals",
  "Other Events": "other-events",
};

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

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
const bannerVariants: Variants = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const bannerSubtitleVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
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

const getCategoryFromContent = (content: string): string => {
  const c = content.toLowerCase();
  if (c.includes("summit") || c.includes("conference") || c.includes("annual") || c.includes("global")) return "Conferences";
  if (c.includes("workshop") || c.includes("masterclass") || c.includes("training") || c.includes("session")) return "Workshops";
  if (c.includes("webinar") || c.includes("online") || c.includes("virtual") || c.includes("zoom")) return "Webinars";
  if (c.includes("networking") || c.includes("meetup") || c.includes("gathering") || c.includes("meeting")) return "Networking";
  if (c.includes("seminar") || c.includes("talk") || c.includes("lecture") || c.includes("presentation")) return "Seminars";
  if (c.includes("dialogue") || c.includes("forum") || c.includes("discussion") || c.includes("panel")) return "Forums";
  if (c.includes("launch") || c.includes("inauguration") || c.includes("unveil") || c.includes("initiative")) return "Launches";
  if (c.includes("award") || c.includes("ceremony") || c.includes("felicitation") || c.includes("recognition")) return "Awards";
  if (c.includes("festival") || c.includes("celebration") || c.includes("day") || c.includes("international")) return "Festivals";
  return "Other Events";
};

const extractExcerpt = (content: string, maxLength = 150): string => {
  if (!content) return "No description available";
  const plain = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return plain.length <= maxLength ? plain : plain.substring(0, maxLength) + "...";
};

const extractLocation = (content: string): string => {
  const c = content.toLowerCase();
  const known = [
    { keyword: "rio de janeiro", location: "Rio de Janeiro, Brazil" },
    { keyword: "iit delhi",      location: "IIT Delhi, India" },
    { keyword: "india",          location: "India" },
    { keyword: "brazil",         location: "Brazil" },
    { keyword: "haryana",        location: "Haryana, India" },
    { keyword: "punjab",         location: "Punjab, India" },
    { keyword: "rajasthan",      location: "Rajasthan, India" },
    { keyword: "delhi",          location: "Delhi, India" },
  ];
  for (const k of known) if (c.includes(k.keyword)) return k.location;
  if (c.includes("online") || c.includes("virtual") || c.includes("zoom") || c.includes("webinar")) return "Online";
  if (c.includes("apply") && c.includes("link")) return "Online / Application-based";
  return "Location TBD";
};

const extractDateDetails = (content: string, fallback: string): { date: string; time?: string } => {
  const rangePattern = /(\d+(?:st|nd|rd|th)?\s+[A-Z][a-z]+(?:\s+to\s+\d+(?:st|nd|rd|th)?\s+[A-Z][a-z]+)?\s+\d{4})/gi;
  const rangeMatch = rangePattern.exec(content);
  if (rangeMatch?.[1]) return { date: rangeMatch[1].trim() };
  const datePatterns = [
    /(\d+(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4})/gi,
    /([A-Z][a-z]+\s+\d+(?:\s*,\s*\d{4})?)/gi,
    /([A-Z][a-z]+\s+\d{4})/gi,
  ];
  for (const pattern of datePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        let dateStr = match[1].trim().replace(/(\d+)(?:st|nd|rd|th)\b/gi, "$1");
        if (!/^[A-Z][a-z]+$/.test(dateStr)) {
          if (!dateStr.match(/\d{4}/)) dateStr += `, ${fallback.substring(0, 4)}`;
          return { date: dateStr };
        }
      }
    }
  }
  try {
    const d = new Date(fallback);
    if (!isNaN(d.getTime()))
      return { date: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) };
  } catch { /* fallthrough */ }
  return { date: "Date TBD" };
};

const extractPrice = (content: string): string => {
  const c = content.toLowerCase();
  if (c.includes("free") || c.includes("fully funded") || c.includes("complimentary") || c.includes("no cost")) return "Free";
  const patterns = [/₹\s*(\d+(?:,\d{3})*)/gi, /Rs\.?\s*(\d+(?:,\d{3})*)/gi, /\$\s*(\d+(?:,\d{3})*)/gi];
  for (const p of patterns) {
    const m = p.exec(content);
    if (m?.[1]) return `${p.toString().includes("$") ? "$" : "₹"}${m[1]}`;
  }
  return "Contact for details";
};

const extractFormat = (content: string): string => {
  const c = content.toLowerCase();
  if ((c.includes("online") || c.includes("virtual") || c.includes("zoom") || c.includes("webinar")) && !c.includes("in-person")) return "Virtual";
  if ((c.includes("in-person") || c.includes("venue") || c.includes("summit") || c.includes("conference")) && !c.includes("online") && !c.includes("virtual")) return "In-person";
  if (c.includes("hybrid") || (c.includes("online") && c.includes("in-person"))) return "Hybrid";
  if (c.includes("application") || c.includes("programme")) return "Application-based";
  return "Format TBD";
};

const parseDateForDisplay = (dateString: string, fallbackDate?: string): { month: string; day: string } => {
  try {
    const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const clean = dateString.replace(/(\d+)(?:st|nd|rd|th)\b/gi, "$1").replace(/\s+to\s+\d+/gi, "").trim();
    const monthMatch = monthNames.find((m) => clean.toLowerCase().includes(m));
    let parsed: Date;
    if (monthMatch) {
      parsed = new Date();
      parsed.setMonth(monthNames.indexOf(monthMatch));
      const dayMatch = clean.match(/\b(\d{1,2})\b/);
      parsed.setDate(dayMatch ? parseInt(dayMatch[1]) : 15);
    } else {
      parsed = new Date(clean);
      if (isNaN(parsed.getTime())) parsed = fallbackDate ? new Date(fallbackDate) : new Date();
    }
    return {
      month: parsed.toLocaleDateString("en-US", { month: "short" }),
      day:   parsed.getDate().toString(),
    };
  } catch {
    return { month: "TBD", day: "?" };
  }
};

const transformApiItem = (item: ApiContentItem, index: number): ProcessedEvent => {
  const rawContent  = item.summary ?? "";
  const category    = item.categoryName ? item.categoryName : getCategoryFromContent(rawContent);
  const description = item.summary
    ? item.summary.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    : extractExcerpt(rawContent);
  const title    = item.title?.replace(/&amp;/g, "&") ?? "Upcoming Event";
  const location = extractLocation(rawContent);
  const format   = extractFormat(rawContent);
  const price    = extractPrice(rawContent);
  const postDate = item.publishedAt ?? new Date().toISOString();
  const { date, time } = extractDateDetails(rawContent, postDate);
  const { month, day } = parseDateForDisplay(date, postDate);
  const image = item.featuredImage && item.featuredImage.trim() !== "" ? item.featuredImage : "";
  return {
    id: item.id, category, title, description, date, time,
    location, format, price, image,
    fullContent: rawContent,
    slug:     item.slug ?? `event-${item.id}`,
    featured: index === 0,
    month, day, postDate,
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventsPage() {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery]           = useState("");
  const [dateRange, setDateRange]               = useState({ from: "", to: "" });
  const [selectedDateRange, setSelectedDateRange] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [currentPage, setCurrentPage]           = useState(1);
  const [isFilterOpen, setIsFilterOpen]         = useState(false);

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE);

  // ── Data state ────────────────────────────────────────────────────────────
  const [processedEvents, setProcessedEvents] = useState<ProcessedEvent[]>([]);
  const [featuredEvent, setFeaturedEvent]     = useState<ProcessedEvent | null>(null);
  const [totalItems, setTotalItems]           = useState(0);
  const [totalPages, setTotalPages]           = useState(0);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading]   = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  // ── Image state ───────────────────────────────────────────────────────────
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [imageError, setImageError]     = useState<Set<string>>(new Set());

  // ── Refs ──────────────────────────────────────────────────────────────────
  const filterRef      = useRef<HTMLDivElement>(null);
  const filterAbortRef = useRef<AbortController | null>(null);
  const isFirstRender  = useRef(true);

  const router = useRouter();

  // ── URL builder ───────────────────────────────────────────────────────────
  const buildUrl = useCallback((opts: {
    page?: number; search?: string; categorySlugs?: string[];
    dateFrom?: string; dateTo?: string;
  }) => {
    const p = new URLSearchParams({ contentType: "EVENT", limit: String(ITEMS_PER_PAGE) });
    if (opts.page)                  p.set("page",     String(opts.page));
    if (opts.search)                p.set("search",   opts.search);
    if (opts.categorySlugs?.length) p.set("category", opts.categorySlugs.map(c => categorySlugMap[c] ?? c.toLowerCase()).join(","));
    if (opts.dateFrom)              p.set("dateFrom", opts.dateFrom);
    if (opts.dateTo)                p.set("dateTo",   opts.dateTo);
    return `/api/content?${p}`;
  }, []);

  // ── On mount: initial fetch ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl({ page: 1 }));
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: ApiResponse = await res.json();
        const processed = data.items.map((item, idx) => transformApiItem(item, idx));
        setFeaturedEvent(processed[0] ?? null); // pinned — never overwritten by filters
        setProcessedEvents(processed.slice(1)); // grid = rest of initial items
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Init fetch error:", err);
        setError("Failed to load events. Please try again.");
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [buildUrl]);
// ── Filter fetch (no full-page reload) ───────────────────────────────────
const fetchFilteredEvents = useCallback(async () => {
  if (filterAbortRef.current) filterAbortRef.current.abort();
  filterAbortRef.current = new AbortController();
  setIsFilterLoading(true);
  setError(null);

  try {
    const res = await fetch(
      buildUrl({
        page:          currentPage,
        search:        debouncedSearch || undefined,
        categorySlugs: selectedCategories.length ? selectedCategories : undefined,
        dateFrom:      dateRange.from || undefined,
        dateTo:        dateRange.to   || undefined,
      }),
      { signal: filterAbortRef.current.signal }
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: ApiResponse = await res.json();
    const processed = data.items.map((item, idx) =>
      transformApiItem(item, (currentPage - 1) * ITEMS_PER_PAGE + idx)
    );
    setProcessedEvents(processed); // all filtered results go to grid
    setTotalPages(data.totalPages);
    setTotalItems(data.totalItems); // ← ADD THIS LINE to update total items count
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    console.error("Filter fetch error:", err);
    setProcessedEvents([]);
  } finally {
    setIsFilterLoading(false);
  }
}, [buildUrl, currentPage, debouncedSearch, selectedCategories, dateRange]);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchFilteredEvents();
  }, [fetchFilteredEvents]);

  // ── Click-outside for filter panel ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setIsFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCardClick = (slug: string) => router.push(`/events/${slug}`);

  const handleContactClick = (event: ProcessedEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    openEventRegistrationEmail({
      title: event.title, date: event.date, time: event.time,
      location: event.location, format: event.format,
      price: event.price, category: event.category,
    });
  };

  const handleImageLoad  = (id: string) => setImagesLoaded((prev) => { const s = new Set(prev); s.add(id); return s; });
  const handleImageError = (id: string) => setImageError((prev)   => { const s = new Set(prev); s.add(id); return s; });

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

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSearchQuery("");
    setDateRange({ from: "", to: "" });
    setSelectedDateRange("");
    setShowCustomDatePicker(false);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const isAnyFilterActive = () => selectedCategories.length > 0 || !!searchQuery || !!dateRange.from || !!dateRange.to;

  const activeFilterCount = [selectedCategories.length > 0, !!searchQuery, !!(dateRange.from || dateRange.to)].filter(Boolean).length;

  const gridEvents = processedEvents; // all filtered results, no slicing
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex   = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isInitialLoading) return (
    <main className="bg-background min-h-screen">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading events…</p>
        </div>
      </div>
    </main>
  );

  if (error && !processedEvents.length) return (
    <main className="bg-background min-h-screen flex items-center justify-center">
      <div className="text-center py-20">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    </main>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="bg-background min-h-screen flex flex-col">

      {/* ── Banner (unchanged) ──────────────────────────────────────────────── */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image src="/events/Mobile-Events.png" alt="Events Banner" fill
              className="object-cover object-center" priority sizes="(max-width: 1024px) 100vw" />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image src="/events/FinalEventsbanner.png" alt="Events Banner" fill
              className="object-cover object-center" priority sizes="(min-width: 1024px) 100vw" />
          </div>
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">Events</span>
                </h1>
              </motion.div>
              <motion.p initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                Discover workshops, webinars, and networking events designed to support women entrepreneurs.
                Explore opportunities for learning, mentoring, and meaningful connections that help your business grow.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Event (unchanged) ──────────────────────────────────────── */}
      {featuredEvent && (
        <ScrollFade>
          <section className="px-4 sm:px-6 lg:px-8 py-8 flex-1">
            <div className="max-w-screen-xl mx-auto">
              <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: false }}
                className="grid lg:grid-cols-[65%_35%] bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl border border-primary/10 hover:shadow-2xl transition-shadow duration-300">

                <motion.div variants={fadeInLeft} className="relative min-h-48 sm:min-h-64 overflow-hidden bg-gradient-to-br from-muted to-secondary">
                  {featuredEvent.image && !imageError.has(featuredEvent.id) ? (
                    <>
                      {!imagesLoaded.has(featuredEvent.id) && (
                        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                      )}
                      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} className="w-full h-full">
                        <Image
                          src={featuredEvent.image}
                          alt={featuredEvent.title}
                          fill
                          className={`md:object-contain object-cover transition-opacity duration-500 ${imagesLoaded.has(featuredEvent.id) ? "opacity-100" : "opacity-0"}`}
                          priority
                          onLoad={() => handleImageLoad(featuredEvent.id)}
                          onError={() => handleImageError(featuredEvent.id)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 800px"
                        />
                      </motion.div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-7xl font-bold text-primary/30">
                        {featuredEvent.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </motion.div>

                <motion.div variants={fadeInRight} className="p-4 flex flex-col justify-center">
                  <motion.span variants={scaleIn}
                    className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4 w-fit">
                    {featuredEvent.category}
                  </motion.span>
                  <AnimatedText as="h2" className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-3 sm:mb-4">
                    {featuredEvent.title}
                  </AnimatedText>
                  <AnimatedText delay={0.1} className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed line-clamp-3">
                    {featuredEvent.description}
                  </AnimatedText>

                  <motion.div variants={staggerContainer} className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {[{ icon: Users, text: featuredEvent.format }].map(({ icon: Icon, text }) => (
                      <motion.div key={text} variants={fadeInUp} className="flex items-center gap-2 sm:gap-3 text-foreground">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="font-medium text-sm sm:text-base">{text}</span>
                      </motion.div>
                    ))}
                    <motion.div variants={fadeInUp} className="flex items-center gap-2 sm:gap-3 text-foreground">
                      <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                      <span className="font-semibold text-base sm:text-lg">{featuredEvent.price}</span>
                    </motion.div>
                  </motion.div>

                  <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3 w-full">
                    <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={() => handleCardClick(featuredEvent.slug)} variant="outline"
                        className="h-10 sm:h-12 border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-all text-sm sm:text-base w-full">
                        View Details
                      </Button>
                    </motion.div>
                    <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={(e) => handleContactClick(featuredEvent, e)}
                        className="h-10 sm:h-12 bg-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base w-full">
                        <Mail className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Contact
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </ScrollFade>
      )}

      {/* ── All Events Grid (no sidebar) ────────────────────────────────────── */}
  {/* ── All Events Grid (no sidebar) ────────────────────────────────────── */}
<section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-secondary/30 flex-1">
  <div className="max-w-screen-xl mx-auto">

    {/* Header + Search + Filter — matches BlogsPage layout */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 sm:mb-12">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
          {selectedCategories.length > 0 ? selectedCategories.join(", ") : "All Events"}
          {debouncedSearch && <span className="text-lg sm:text-xl text-primary"> — Search: {debouncedSearch}</span>}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          {isFilterLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Filtering…
            </span>
          ) : (
            <>
              {totalItems} {totalItems === 1 ? "event" : "events"} found
              {selectedCategories.length > 0 && ` in ${selectedCategories.join(", ")}`}
              {debouncedSearch && ` matching "${debouncedSearch}"`}
              {getDateRangeDisplayLabel() && ` • ${getDateRangeDisplayLabel()}`}
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
              placeholder="Search events…"
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

          {/* Filter button + dropdown - full width on mobile */}
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
                  key="events-filter-panel"
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
                    <h4 className="text-lg font-semibold text-foreground">Filter Events</h4>
                    <button onClick={() => setIsFilterOpen(false)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
                    <div className="flex flex-wrap gap-2">
                      {eventCategoryNames.map((cat) => (
                        <button key={cat}
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                            );
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${selectedCategories.includes(cat) ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

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

                  {/* Active filters + clear all */}
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
                        {selectedCategories.map((cat) => (
                          <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {cat}
                            <button onClick={() => { setSelectedCategories((prev) => prev.filter((c) => c !== cat)); setCurrentPage(1); }}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
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

          {/* Grid */}
          {isFilterLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden border border-border animate-pulse">
                  <div className="h-40 sm:h-44 bg-muted" />
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : gridEvents.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No events found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {debouncedSearch
                  ? `No events matching "${debouncedSearch}".`
                  : selectedCategories.length > 0
                  ? `No events found in "${selectedCategories.join(", ")}".`
                  : "No upcoming events yet."}
              </p>
              <Button onClick={clearAllFilters} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                View All Events
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div variants={staggerContainer} initial="hidden" whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {gridEvents.map((event) => (
                  <motion.div key={event.id} variants={fadeInUp}
                    whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
                    className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-border">

                    <div onClick={() => handleCardClick(event.slug)}
                      className="relative h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-muted to-secondary cursor-pointer">
                      {event.image && !imageError.has(event.id) ? (
                        <>
                          {!imagesLoaded.has(event.id) && (
                            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                          )}
                          <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }} className="w-full h-full">
                            <Image
                              src={event.image}
                              alt={event.title} fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className={`object-cover transition-opacity duration-300 ${imagesLoaded.has(event.id) ? "opacity-100" : "opacity-0"}`}
                              onLoad={() => handleImageLoad(event.id)}
                              onError={() => handleImageError(event.id)}
                              loading="lazy"
                            />
                          </motion.div>
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <span className="text-5xl font-bold text-primary/30">
                            {event.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                        className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 text-center shadow-lg">
                        <div className="text-xs text-muted-foreground font-medium uppercase">{event.month}</div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">{event.day}</div>
                      </motion.div>
                      <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        <span className="px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground">
                          {event.format.split(" ")[0]}
                        </span>
                      </motion.div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <div onClick={() => handleCardClick(event.slug)} className="cursor-pointer">
                        <motion.span variants={scaleIn}
                          className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 sm:mb-3 uppercase">
                          {event.category}
                        </motion.span>
                        <AnimatedText as="h3" delay={0.1}
                          className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {event.title}
                        </AnimatedText>
                      </div>

                      <motion.div variants={staggerContainer}
                        className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                        <div className="flex gap-2">
                          <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={(e) => handleContactClick(event, e)} size="sm" variant="outline"
                              className="border-primary text-primary hover:bg-primary hover:text-white">
                              <Mail className="mr-1 h-3 w-3" /> Contact
                            </Button>
                          </motion.div>
                          <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={() => handleCardClick(event.slug)} size="sm"
                              className="bg-primary hover:bg-primary/90 text-white">
                              View Details
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">

                  {/* Mobile */}
                  <div className="flex sm:hidden flex-col items-center gap-3">
                    <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
                    <div className="flex items-center gap-1.5 w-full justify-center flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1} className="h-9 px-3 gap-1 text-xs">
                        <ArrowRight className="h-3 w-3 rotate-180" /> Prev
                      </Button>
                      {buildPageNumbers(currentPage, totalPages, true).map((p, i) =>
                        p === "…" ? (
                          <span key={`me-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button key={`m-${p}`} variant={currentPage === p ? "default" : "outline"}
                            size="sm" className="h-9 w-9 p-0 text-xs" onClick={() => handlePageChange(p as number)}>
                            {p}
                          </Button>
                        )
                      )}
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages} className="h-9 px-3 gap-1 text-xs">
                        Next <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:flex flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground shrink-0">
                      Showing {startIndex}–{endIndex} of {totalItems} events
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1} className="gap-1">
                        <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {buildPageNumbers(currentPage, totalPages, false).map((p, i) =>
                          p === "…" ? (
                            <span key={`de-${i}`} className="px-2 text-muted-foreground">…</span>
                          ) : (
                            <motion.div key={`d-${p}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                              <Button variant={currentPage === p ? "default" : "outline"}
                                size="sm" className="w-10 h-10 p-0"
                                onClick={() => handlePageChange(p as number)}>
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