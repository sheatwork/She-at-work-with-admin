"use client";

import { AnimatedText, ScrollFade } from "@/components/common/ScrollFade";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { openEventRegistrationEmail } from "@/hooks/Emailutils";
import { motion, Variants } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Facebook,
  IndianRupee,
  Linkedin,
  Mail,
  MapPin,
  Share2,
  Twitter,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

// ─── API Types ────────────────────────────────────────────────────────────────

interface ApiTag {
  id: string;
  name: string;
  slug: string;
}

interface ApiContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  featuredImage: string | null;
  externalUrl: string | null;
  readingTime: number | null;
  publishedAt: string | null;
  authorName: string | null;
  contentType: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: ApiTag[];
}

interface ApiRelatedItem {
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
  tags: ApiTag[];
}

interface ApiDetailResponse {
  item: ApiContentItem;
  related: ApiRelatedItem[];
}

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
const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

// ─── Helper: derive category from content ────────────────────────────────────

const extractCategory = (categoryName: string | null, content: string): string => {
  // Prefer the DB category name if present
  if (categoryName) return categoryName;

  const c = content.toLowerCase();
  if (c.includes("summit") || c.includes("conference")) return "Conferences";
  if (c.includes("workshop") || c.includes("masterclass")) return "Workshops";
  if (c.includes("webinar") || c.includes("online")) return "Webinars";
  if (c.includes("networking") || c.includes("meetup")) return "Networking";
  if (c.includes("seminar") || c.includes("talk")) return "Seminars";
  if (c.includes("dialogue") || c.includes("forum")) return "Forums";
  if (c.includes("launch") || c.includes("inauguration")) return "Launches";
  if (c.includes("award") || c.includes("ceremony")) return "Awards";
  return "Other Events";
};

// ─── Helper: location ────────────────────────────────────────────────────────

const extractLocation = (content: string): string => {
  const c = content.toLowerCase();
  const known = [
    { keyword: "rio de janeiro", location: "Rio de Janeiro, Brazil" },
    { keyword: "iit delhi", location: "IIT Delhi, India" },
    { keyword: "india", location: "India" },
    { keyword: "brazil", location: "Brazil" },
    { keyword: "haryana", location: "Haryana, India" },
    { keyword: "delhi", location: "Delhi, India" },
  ];
  for (const k of known) if (c.includes(k.keyword)) return k.location;
  if (c.includes("online") || c.includes("virtual") || c.includes("zoom")) return "Online";
  return "Location TBD";
};

// ─── Helper: date ─────────────────────────────────────────────────────────────

const extractDateDetails = (
  content: string,
  publishedAt: string | null
): { date: string; time?: string } => {
  const datePatterns = [
    /(\d+(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4})/gi,
    /([A-Z][a-z]+\s+\d+(?:\s*,\s*\d{4})?)/gi,
  ];
  for (const pattern of datePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        let dateStr = match[1].trim().replace(/(\d+)(?:st|nd|rd|th)\b/gi, "$1");
        if (!/^[A-Z][a-z]+$/.test(dateStr)) {
          if (!dateStr.match(/\d{4}/) && publishedAt) {
            dateStr += `, ${publishedAt.substring(0, 4)}`;
          }
          return { date: dateStr };
        }
      }
    }
  }
  if (publishedAt) {
    try {
      const d = new Date(publishedAt);
      if (!isNaN(d.getTime())) {
        return { date: d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) };
      }
    } catch { /* fallthrough */ }
  }
  return { date: "Date TBD" };
};

// ─── Helper: format ───────────────────────────────────────────────────────────

const extractFormat = (content: string): string => {
  const c = content.toLowerCase();
  if ((c.includes("online") || c.includes("virtual") || c.includes("zoom")) && !c.includes("in-person")) return "Virtual";
  if ((c.includes("in-person") || c.includes("venue") || c.includes("summit") || c.includes("conference")) && !c.includes("online") && !c.includes("virtual")) return "In-person";
  if (c.includes("hybrid")) return "Hybrid";
  return "To be announced";
};

// ─── Helper: price ────────────────────────────────────────────────────────────

const extractPrice = (content: string): string => {
  const c = content.toLowerCase();
  if (c.includes("free") || c.includes("fully funded") || c.includes("complimentary")) return "Free";
  const patterns = [/₹\s*(\d+(?:,\d{3})*)/gi, /Rs\.?\s*(\d+(?:,\d{3})*)/gi, /\$\s*(\d+(?:,\d{3})*)/gi];
  for (const p of patterns) {
    const m = p.exec(content);
    if (m?.[1]) return `${p.toString().includes("$") ? "$" : "₹"}${m[1]}`;
  }
  return "Contact for details";
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [item, setItem] = useState<ApiContentItem | null>(null);
  const [related, setRelated] = useState<ApiRelatedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setSlug(p.id));
  }, [params]);

  // Fetch from /api/content/[slug]
  useEffect(() => {
    if (!slug) return;

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/content/${slug}`);

        if (res.status === 404) {
          setNotFoundFlag(true);
          return;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data: ApiDetailResponse = await res.json();
        setItem(data.item);
        setRelated(data.related ?? []);
      } catch (err) {
        console.error("Failed to fetch event:", err);
        setNotFoundFlag(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Navbar />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full"
            />
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        </motion.div>
      </>
    );
  }

  if (notFoundFlag || !item) {
    notFound();
  }

  // ── Derived display values ──────────────────────────────────────────────────
  // Use full `content` for extraction (detail API returns full content)
  const sourceText = item.content ?? item.summary ?? "";
  const category = extractCategory(item.categoryName, sourceText);
  const location = extractLocation(sourceText);
  const { date, time } = extractDateDetails(sourceText, item.publishedAt);
  const format = extractFormat(sourceText);
  const price = extractPrice(sourceText);
  const title = item.title.replace(/&amp;/g, "&");

  // ── Share handlers ──────────────────────────────────────────────────────────
  const handleShare = (platform: string) => {
    const url = window.location.href;
    switch (platform) {
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this event: ${url}`)}`;
        break;
    }
  };

  const handleContactClick = () => {
    openEventRegistrationEmail({ title, date, time, location, format, price, category });
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Back nav */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border-b"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/events">
              <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Events
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <ScrollFade>
            <motion.header
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mb-8"
            >
              <motion.div variants={fadeInUp} className="flex items-center gap-2 mb-4">
                <motion.span variants={scaleIn} className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase">
                  {category}
                </motion.span>
                <motion.span variants={scaleIn} transition={{ delay: 0.1 }} className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold uppercase">
                  {format}
                </motion.span>
              </motion.div>

              <AnimatedText as="h1" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
                {title}
              </AnimatedText>

              {/* Meta grid */}
              <motion.div variants={scaleIn} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl mb-6">
                <motion.div variants={fadeInLeft} className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium text-foreground">{date}{time && ` • ${time}`}</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeInRight} className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground">{location}</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeInLeft} className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Format</p>
                    <p className="font-medium text-foreground">{format}</p>
                  </div>
                </motion.div>
                <motion.div variants={fadeInRight} className="flex items-center gap-3">
                  <IndianRupee className="h-5 w-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium text-foreground">{price}</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 mb-2">
                  {item.tags.map((tag) => (
                    <span key={tag.id} className="px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground font-medium">
                      #{tag.name}
                    </span>
                  ))}
                </motion.div>
              )}
            </motion.header>
          </ScrollFade>

          {/* Featured image */}
          {item.featuredImage && (
            <ScrollFade>
              <motion.div
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                className="mb-8 rounded-2xl overflow-hidden shadow-xl relative"
              >
                {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                <motion.img
                  src={item.featuredImage}
                  alt={title}
                  className={`w-full h-auto max-h-[500px] object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageLoaded(true)}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </ScrollFade>
          )}

          {/* Share */}
          <ScrollFade>
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="flex items-center justify-between mb-8 p-4 bg-secondary/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Share this event:</span>
              </div>
              <motion.div variants={staggerContainer} className="flex items-center gap-2">
                {([
                  { platform: "facebook", icon: Facebook },
                  { platform: "twitter", icon: Twitter },
                  { platform: "linkedin", icon: Linkedin },
                  { platform: "email", icon: Mail },
                ] as const).map(({ platform, icon: Icon }) => (
                  <motion.div key={platform} variants={scaleIn} whileHover={{ y: -3, scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="sm" onClick={() => handleShare(platform)} className="h-8 w-8 p-0 hover:bg-primary/10">
                      <Icon className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </ScrollFade>

          {/* Full content (HTML from DB) */}
          <ScrollFade>
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="prose prose-lg max-w-none
                        prose-headings:font-display prose-headings:font-bold
                        prose-p:text-foreground/80 prose-p:leading-relaxed
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-strong:font-bold prose-strong:text-foreground
                        prose-ul:list-disc prose-ul:pl-6
                        prose-ol:list-decimal prose-ol:pl-6
                        prose-li:my-2
                        prose-blockquote:border-l-4 prose-blockquote:border-primary
                        prose-blockquote:pl-4 prose-blockquote:italic
                        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                        mb-12"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </ScrollFade>

          {/* External URL CTA (if present) */}
          {item.externalUrl && (
            <ScrollFade>
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                className="mb-8 p-4 bg-secondary/30 rounded-lg flex items-center justify-between gap-4"
              >
                <p className="text-sm text-muted-foreground">Official event page available</p>
                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                    Visit Official Page
                  </Button>
                </a>
              </motion.div>
            </ScrollFade>
          )}

          {/* Contact CTA */}
          <ScrollFade>
            <motion.div
              variants={slideInFromBottom}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="mt-12 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <AnimatedText as="h3" className="text-xl font-display font-bold text-foreground mb-2">
                    Interested in this event?
                  </AnimatedText>
                  <AnimatedText delay={0.1} className="text-foreground/80">
                    Get in touch with us to know more or to register your interest.
                  </AnimatedText>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={handleContactClick} className="bg-accent text-white font-semibold gap-2">
                    <Mail className="h-4 w-4" />
                    Contact via Email
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </ScrollFade>

          {/* Related Events */}
          {related.length > 0 && (
            <ScrollFade>
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false }}
                className="mt-16 pt-8 border-t"
              >
                <AnimatedText as="h2" className="text-2xl font-display font-bold text-foreground mb-6">
                  Related Events
                </AnimatedText>

                <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {related.map((rel, index) => {
                    const relCategory = extractCategory(rel.categoryName, rel.summary ?? "");
                    const relLocation = extractLocation(rel.summary ?? "");
                    const relDate = extractDateDetails(rel.summary ?? "", rel.publishedAt);

                    return (
                      <motion.div
                        key={rel.id}
                        variants={fadeInUp}
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Link href={`/events/${rel.slug}`} className="group">
                          <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border h-full">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ duration: 0.3 }}
                              className="h-48 bg-gradient-to-br from-muted to-secondary bg-cover bg-center relative overflow-hidden"
                              style={{ backgroundImage: rel.featuredImage ? `url(${rel.featuredImage})` : undefined }}
                            >
                              {!rel.featuredImage && (
                                <>
                                  <div className="h-full flex items-center justify-center text-white/40 text-4xl font-display">
                                    {rel.title.charAt(0)}
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-50" />
                                </>
                              )}
                            </motion.div>
                            <div className="p-4">
                              <motion.span
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 uppercase"
                              >
                                {relCategory}
                              </motion.span>
                              <h3 className="font-display font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {rel.title.replace(/&amp;/g, "&")}
                              </h3>
                              <motion.div variants={staggerContainer} className="space-y-1 text-xs text-muted-foreground">
                                <motion.div variants={fadeInLeft} className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{relDate.date}</span>
                                </motion.div>
                                <motion.div variants={fadeInRight} className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="line-clamp-1">{relLocation}</span>
                                </motion.div>
                              </motion.div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            </ScrollFade>
          )}

          {/* Back button */}
          <ScrollFade>
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="mt-12 text-center"
            >
              <Link href="/events">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="lg" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to All Events
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </ScrollFade>
        </article>
      </main>
    </>
  );
}