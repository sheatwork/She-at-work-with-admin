"use client";

import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { Button } from "@/components/ui/button";
import { openEventRegistrationEmail } from "@/hooks/Emailutils";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  Filter,
  IndianRupee,
  Mail,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

// ─── Event categories ─────────────────────────────────────────────────────────

const eventCategories = [
  "All Events",
  "Conferences",
  "Workshops",
  "Webinars",
  "Networking",
  "Seminars",
  "Forums",
  "Launches",
  "Awards",
  "Festivals",
  "Other Events",
];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
};
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const bannerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const bannerSubtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Helper: derive category from content text ────────────────────────────────

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

// ─── Helper: strip HTML and truncate ─────────────────────────────────────────

const extractExcerpt = (content: string, maxLength = 150): string => {
  if (!content) return "No description available";
  const plain = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return plain.length <= maxLength ? plain : plain.substring(0, maxLength) + "...";
};

// ─── Helper: location from content ───────────────────────────────────────────

const extractLocation = (content: string): string => {
  const c = content.toLowerCase();
  const known = [
    { keyword: "rio de janeiro", location: "Rio de Janeiro, Brazil" },
    { keyword: "iit delhi", location: "IIT Delhi, India" },
    { keyword: "india", location: "India" },
    { keyword: "brazil", location: "Brazil" },
    { keyword: "haryana", location: "Haryana, India" },
    { keyword: "punjab", location: "Punjab, India" },
    { keyword: "rajasthan", location: "Rajasthan, India" },
    { keyword: "delhi", location: "Delhi, India" },
  ];
  for (const k of known) if (c.includes(k.keyword)) return k.location;
  if (c.includes("online") || c.includes("virtual") || c.includes("zoom") || c.includes("webinar")) return "Online";
  if (c.includes("apply") && c.includes("link")) return "Online / Application-based";
  return "Location TBD";
};

// ─── Helper: date details ─────────────────────────────────────────────────────

const extractDateDetails = (content: string, fallback: string): { date: string; time?: string } => {
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
    if (!isNaN(d.getTime())) return { date: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) };
  } catch { /* fallthrough */ }
  return { date: "Date TBD" };
};

// ─── Helper: price ────────────────────────────────────────────────────────────

const extractPrice = (content: string): string => {
  const c = content.toLowerCase();
  if (c.includes("free") || c.includes("fully funded") || c.includes("complimentary") || c.includes("no cost")) return "Free";
  const patterns = [/₹\s*(\d+(?:,\d{3})*)/gi, /Rs\.?\s*(\d+(?:,\d{3})*)/gi, /\$\s*(\d+(?:,\d{3})*)/gi];
  for (const p of patterns) {
    const m = p.exec(content);
    if (m?.[1]) {
      const sym = p.toString().includes("$") ? "$" : "₹";
      return `${sym}${m[1]}`;
    }
  }
  return "Contact for details";
};

// ─── Helper: format ───────────────────────────────────────────────────────────

const extractFormat = (content: string): string => {
  const c = content.toLowerCase();
  if ((c.includes("online") || c.includes("virtual") || c.includes("zoom") || c.includes("webinar")) && !c.includes("in-person")) return "Virtual";
  if ((c.includes("in-person") || c.includes("venue") || c.includes("summit") || c.includes("conference")) && !c.includes("online") && !c.includes("virtual")) return "In-person";
  if (c.includes("hybrid") || (c.includes("online") && c.includes("in-person"))) return "Hybrid";
  if (c.includes("application") || c.includes("programme")) return "Application-based";
  return "Format TBD";
};

// ─── Helper: month/day display ────────────────────────────────────────────────

const parseDateForDisplay = (dateString: string, fallbackDate?: string): { month: string; day: string } => {
  try {
    const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const clean = dateString.replace(/(\d+)(?:st|nd|rd|th)\b/gi, "$1").replace(/\s+to\s+\d+/gi, "").trim();
    const monthMatch = monthNames.find(m => clean.toLowerCase().includes(m));
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
    return { month: parsed.toLocaleDateString("en-US", { month: "short" }), day: parsed.getDate().toString() };
  } catch {
    return { month: "TBD", day: "?" };
  }
};

// ─── Transform API item → ProcessedEvent ─────────────────────────────────────

const transformApiItem = (item: ApiContentItem, index: number): ProcessedEvent => {
  // Use summary first, fall back to extracting from content
  const rawContent = item.summary ?? "";

  // Category: prefer API category name, derive from content as fallback
  const category = item.categoryName
    ? item.categoryName
    : getCategoryFromContent(rawContent);

  const description = item.summary
    ? item.summary.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    : extractExcerpt(rawContent);

  const title = item.title?.replace(/&amp;/g, "&") ?? "Upcoming Event";
  const location = extractLocation(rawContent);
  const format = extractFormat(rawContent);
  const price = extractPrice(rawContent);
  const postDate = item.publishedAt ?? new Date().toISOString();
  const { date, time } = extractDateDetails(rawContent, postDate);
  const { month, day } = parseDateForDisplay(date, postDate);

  const image =
    item.featuredImage && item.featuredImage.trim() !== ""
      ? item.featuredImage
      : "/placeholder-event.jpg";

  return {
    id: item.id,
    category,
    title,
    description,
    date,
    time,
    location,
    format,
    price,
    image,
    fullContent: rawContent,
    slug: item.slug ?? `event-${item.id}`,
    featured: index === 0,
    month,
    day,
    postDate,
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Events");
  const [showFilter, setShowFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [processedEvents, setProcessedEvents] = useState<ProcessedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // ── Fetch from API whenever page or category changes ─────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          contentType: "EVENT",
          page: String(currentPage),
          limit: String(ITEMS_PER_PAGE),
        });

        // Pass category slug if a non-"All" filter is active
        if (selectedCategory !== "All Events") {
          // Convert display name → slug format (e.g. "Other Events" → "other-events")
          params.set("category", selectedCategory.toLowerCase().replace(/\s+/g, "-"));
        }

        const res = await fetch(`/api/content?${params.toString()}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data: ApiResponse = await res.json();

        const processed = data.items.map((item, idx) =>
          transformApiItem(item, (currentPage - 1) * ITEMS_PER_PAGE + idx)
        );

        // Mark first item of first page as featured
        if (currentPage === 1 && processed.length > 0) {
          processed[0].featured = true;
        }

        setProcessedEvents(processed);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setError("Failed to load events. Please try again.");
        setProcessedEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentPage, selectedCategory]);

  // ── Reset page when category changes ─────────────────────────────────────
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
    setShowFilter(false);
  };

  const featuredEvent = currentPage === 1 ? processedEvents.find((e) => e.featured) : null;
  // Non-featured events for the grid (on page 1 skip the featured; other pages show all)
  const gridEvents = currentPage === 1
    ? processedEvents.filter((e) => !e.featured)
    : processedEvents;

  // Sidebar "upcoming soon" — first 4 items always
  const upcomingEvents = processedEvents.slice(0, 4);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCardClick = (slug: string) => router.push(`/events/${slug}`);

  const handleContactClick = (event: ProcessedEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    openEventRegistrationEmail({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      format: event.format,
      price: event.price,
      category: event.category,
    });
  };

  const handleImageLoad = (id: string) =>
    setImagesLoaded((prev) => ({ ...prev, [id]: true }));

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="bg-background min-h-screen">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading new events…</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center py-20">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen flex flex-col">
      {/* ── Banner ── */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image src="/events/Mobile-Events.png" alt="News Banner" fill className="object-contain object-center" priority sizes="(max-width: 1024px) 100vw" />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image src="/events/FinalEventsbanner.png" alt="News Banner" fill className="object-cover object-center" priority sizes="(min-width: 1024px) 100vw" />
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
              <motion.p initial="hidden" animate="visible" variants={bannerSubtitleVariants} className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl">
                Discover workshops, webinars, and networking events designed to support women entrepreneurs. Explore opportunities for learning, mentoring, and meaningful connections that help your business grow.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Event ── */}
      {featuredEvent && (
        <ScrollFade>
          <section className="px-4 sm:px-6 lg:px-8 py-8  flex-1">
            <div className="max-w-screen-xl mx-auto">
              <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: false }}
                className="grid lg:grid-cols-[65%_35%] bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl border border-primary/10 hover:shadow-2xl transition-shadow duration-300">
                <motion.div variants={fadeInLeft} className="relative min-h-48 sm:min-h-64 overflow-hidden bg-gradient-to-br from-muted to-secondary">
                  {!imagesLoaded[featuredEvent.id] && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                  <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} className="w-full h-full">
                    <Image
                      src={featuredEvent.image}
                      alt={featuredEvent.title}
                      fill
                      className={`object-contain transition-opacity duration-500 ${imagesLoaded[featuredEvent.id] ? "opacity-100" : "opacity-0"}`}
                      priority
                      onLoad={() => handleImageLoad(featuredEvent.id)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 800px"
                    />
                  </motion.div>
                </motion.div>

                <motion.div variants={fadeInRight} className="p-4  flex flex-col justify-center">
                  <motion.span variants={scaleIn} className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4 w-fit">
                    {featuredEvent.category}
                  </motion.span>
                  <AnimatedText as="h2" className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-3 sm:mb-4">
                    {featuredEvent.title}
                  </AnimatedText>
                  <AnimatedText delay={0.1} className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed line-clamp-3">
                    {featuredEvent.description}
                  </AnimatedText>

                  <motion.div variants={staggerContainer} className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {[
                      
                     
                      { icon: Users, text: featuredEvent.format },
                    ].map(({ icon: Icon, text }) => (
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
                      <Button onClick={() => handleCardClick(featuredEvent.slug)} variant="outline" className="h-10 sm:h-12 border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-white transition-all text-sm sm:text-base w-full">
                        View Details
                      </Button>
                    </motion.div>
                    <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={(e) => handleContactClick(featuredEvent, e)} className="h-10 sm:h-12 bg-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base w-full">
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

      {/* ── Events Grid + Sidebar ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-secondary/30 flex-1">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6 sm:gap-8">

            {/* ── Main grid ── */}
            <div className="lg:col-span-3">
              <ScrollFade>
                <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: false }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
                      {selectedCategory === "All Events" ? "All Events" : selectedCategory}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {totalItems} {totalItems === 1 ? "event" : "events"} found
                      {selectedCategory !== "All Events" && ` in ${selectedCategory}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedCategory !== "All Events" && (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" className="flex items-center gap-2 border-2 w-full sm:w-auto" onClick={() => handleCategoryChange("All Events")}>
                          <X className="h-3 w-3 sm:h-4 sm:w-4" /> Clear Filter
                        </Button>
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="flex items-center gap-2 border-2 w-full sm:w-auto" onClick={() => setShowFilter(!showFilter)}>
                        <Filter className="h-3 w-3 sm:h-4 sm:w-4" /> Filter
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </ScrollFade>

              <AnimatePresence>
                {showFilter && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mb-6 overflow-hidden">
                    <div className="p-4 bg-card rounded-xl shadow-lg border border-border">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {eventCategories.slice(1).map((cat) => (
                          <motion.button key={cat} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-3 py-2 rounded-lg transition-colors text-sm ${selectedCategory === cat ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary text-muted-foreground"}`}>
                            {cat}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {gridEvents.length === 0 && !featuredEvent ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-foreground mb-2">No events found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    There are no upcoming events{selectedCategory !== "All Events" ? ` in the "${selectedCategory}" category` : ""} yet.
                  </p>
                  <Button onClick={() => handleCategoryChange("All Events")} className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                    View All Events
                  </Button>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-50px" }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {gridEvents.map((event) => (
                      <motion.div key={event.id} variants={fadeInUp} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}
                        className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-border">
                        <div onClick={() => handleCardClick(event.slug)} className="relative h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-muted to-secondary cursor-pointer">
                          {!imagesLoaded[event.id] && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                          <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }} className="w-full h-full">
                            <Image
                              src={event.image}
                              alt={event.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className={`object-cover transition-opacity duration-300 ${imagesLoaded[event.id] ? "opacity-100" : "opacity-0"}`}
                              onLoad={() => handleImageLoad(event.id)}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              loading="lazy"
                            />
                          </motion.div>
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
                            <motion.span variants={scaleIn} className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 sm:mb-3 uppercase">
                              {event.category}
                            </motion.span>
                            <AnimatedText as="h3" delay={0.1} className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                              {event.title}
                            </AnimatedText>
                          </div>

                          <motion.div variants={staggerContainer} className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                            <div className="flex gap-2">
                              <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button onClick={(e) => handleContactClick(event, e)} size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                                  <Mail className="mr-1 h-3 w-3" /> Contact
                                </Button>
                              </motion.div>
                              <motion.div variants={scaleIn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button onClick={() => handleCardClick(event.slug)} size="sm" className="bg-primary hover:bg-primary/90 text-white">
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 sm:mt-12 pt-8 border-t border-border">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} events
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="gap-1">
                            <ArrowRight className="h-3 w-3 rotate-180" /> Previous
                          </Button>
                        </motion.div>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                            return (
                              <motion.div key={pageNum} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-10 h-10 p-0" onClick={() => handlePageChange(pageNum)}>
                                  {pageNum}
                                </Button>
                              </motion.div>
                            );
                          })}
                          {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                              <span className="px-2">...</span>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="outline" size="sm" className="w-10 h-10 p-0" onClick={() => handlePageChange(totalPages)}>
                                  {totalPages}
                                </Button>
                              </motion.div>
                            </>
                          )}
                        </div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1">
                            Next <ArrowRight className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <ScrollFade>
                <motion.div variants={scaleIn} className="bg-card rounded-xl p-5 shadow-lg border border-border">
                  <motion.div variants={fadeInUp} className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> Upcoming Soon
                    </h3>
                  </motion.div>
                  <motion.div variants={staggerContainer} className="space-y-4">
                    {upcomingEvents.length > 0 ? upcomingEvents.map((event, index) => (
                      <motion.div key={event.id} variants={fadeInLeft} whileHover={{ x: 5 }} onClick={() => handleCardClick(event.slug)}
                        className="block group cursor-pointer pb-4 border-b border-border last:border-0 last:pb-0 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {index + 1}
                          </motion.span>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                            {event.category.split(" ")[0]}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5 leading-snug text-sm line-clamp-2">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{event.month} {event.day}</span>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-2">
                        <p className="text-muted-foreground text-sm">No upcoming events</p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </ScrollFade>

              <ScrollFade>
                <motion.div variants={scaleIn} className="bg-gradient-to-br from-secondary/50 to-secondary rounded-xl p-5 border border-border">
                  <h3 className="text-base font-display font-bold text-foreground mb-3">Event Categories</h3>
                  <motion.div variants={staggerContainer} className="space-y-2">
                    {eventCategories.slice(1).map((cat) => (
                      <motion.button key={cat} variants={fadeInRight} whileHover={{ x: 5 }} onClick={() => handleCategoryChange(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${selectedCategory === cat ? "bg-primary/10 text-primary font-medium" : "hover:bg-white/20 text-muted-foreground"}`}>
                        {cat}
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              </ScrollFade>

              {selectedCategory !== "All Events" && (
                <ScrollFade>
                  <motion.div variants={scaleIn} className="bg-primary/5 rounded-xl p-5 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-display font-bold text-foreground">Active Filter</h3>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleCategoryChange("All Events")}
                        className="text-xs text-primary hover:text-accent transition-colors font-medium">
                        Clear
                      </motion.button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Viewing events in:</p>
                    <motion.div variants={scaleIn} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold text-center shadow-sm">
                      {selectedCategory}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {totalItems} {totalItems === 1 ? "event" : "events"} found
                    </p>
                  </motion.div>
                </ScrollFade>
              )}

              <ScrollFade>
                <motion.div variants={scaleIn} className="bg-card rounded-xl p-5 shadow-lg border border-border">
                  <h3 className="text-base font-display font-bold text-foreground mb-3">Event Tips</h3>
                  <motion.ul variants={staggerContainer} className="space-y-2 text-xs text-muted-foreground">
                    {[
                      { icon: Clock, text: "Register early for best rates" },
                      { icon: Users, text: "Network with fellow attendees" },
                      { icon: Calendar, text: "Add events to your calendar" },
                    ].map(({ icon: Icon, text }) => (
                      <motion.li key={text} variants={fadeInUp} className="flex items-start gap-2">
                        <Icon className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                        <span>{text}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </motion.div>
              </ScrollFade>
            </aside>
          </div>
        </div>
      </section>

      <ScrollFade>
        <Cta />
      </ScrollFade>
    </main>
  );
}