// /app/about/press-room/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Calendar, Clock,
  Facebook, Linkedin, Mail, Share2, Tag, Twitter, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar/Navbar";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ApiTag = { id: string; name: string; slug: string };

type PressDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;               // raw WordPress HTML
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
  galleryImages?: string[] | null; // For gallery images from content
};

type RelatedItem = Omit<PressDetail, "content" | "externalUrl" | "contentType" | "categoryId" | "galleryImages">;

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function handleShare(platform: string, url: string, title: string) {
  const enc = encodeURIComponent;
  const map: Record<string, string> = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    twitter:  `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    email:    `mailto:?subject=${enc(title)}&body=${enc(`Check out this press release: ${url}`)}`,
  };
  if (platform === "email") { window.location.href = map.email; return; }
  window.open(map[platform], "_blank");
}

// Extract gallery images from content (if any)
const extractGalleryImages = (content: string): string[] => {
  const images: string[] = [];
  
  // Match WordPress gallery shortcode
  const galleryRegex = /\[gallery[^\]]*ids="([^"]+)"[^\]]*\]/g;
  const match = galleryRegex.exec(content);
  
  if (match && match[1]) {
    // If there are IDs, we don't have the actual URLs
    // For now, return empty array - we'll rely on featured image
    return [];
  }
  
  // Also look for direct image URLs in content
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(content)) !== null) {
    if (imgMatch[1] && !images.includes(imgMatch[1])) {
      images.push(imgMatch[1]);
    }
  }
  
  return images;
};

// Clean HTML for excerpt/title display
const cleanText = (text: string | null): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&\w+;/g, ' ')
    .trim();
};

// Check if content is gallery-only
const isGalleryOnly = (content: string | null, galleryImages: string[] | null | undefined): boolean => {
  if (!content) return false;
  const cleanContent = cleanText(content);
  return cleanContent.length < 50 && !!(galleryImages && galleryImages.length > 0);
};

// Process content for display
const processContent = (content: string | null, isGalleryOnlyPost: boolean): string => {
  if (!content) return '<p>Content not available</p>';
  
  if (isGalleryOnlyPost) {
    return '<p class="text-muted-foreground italic">This press release contains a gallery of images. View the gallery below for complete coverage.</p>';
  }
  
  // Clean up WordPress HTML
  const processed = content
    .replace(/<!--\s*wp:paragraph\s*-->/g, '')
    .replace(/<!--\s*\/wp:paragraph\s*-->/g, '')
    .replace(/<!--\s*wp:heading\s*-->/g, '')
    .replace(/<!--\s*\/wp:heading\s*-->/g, '')
    .replace(/<!--\s*wp:list\s*-->/g, '')
    .replace(/<!--\s*\/wp:list\s*-->/g, '')
    .replace(/<!--\s*wp:image[^>]*-->/g, '')
    .replace(/<!--\s*\/wp:image\s*-->/g, '')
    .replace(/\[gallery[^\]]*\]/g, ''); // Remove gallery shortcode

  return processed;
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PressDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [press, setPress]             = useState<PressDetail | null>(null);
  const [related, setRelated]         = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [notFoundFlag, setNotFound]   = useState(false);
  const [pageUrl, setPageUrl]         = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isGalleryOnlyPost, setIsGalleryOnlyPost] = useState(false);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // ── Unwrap params + fetch in one effect ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { slug } = await params;
        const res = await fetch(`/api/content/${slug}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        
        setPress(data.item);
        setRelated(data.related ?? []);
        
        // Extract gallery images from content
        if (data.item?.content) {
          const images = extractGalleryImages(data.item.content);
          setGalleryImages(images);
          
          // Check if it's gallery-only content
          setIsGalleryOnlyPost(isGalleryOnly(data.item.content, images));
        }
      } catch (err) {
        console.error("Press fetch error:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [params]);

  // ── States ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading press release…</p>
          </div>
        </div>
      </>
    );
  }

  if (notFoundFlag || !press) return notFound();

  const cleanTitle = cleanText(press.title) || 'Untitled Press Release';

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">

        {/* ── Back nav ───────────────────────────────────────────────────────── */}
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/about/press-room">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Press Room
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="mb-8 lg:mb-12">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Featured Image */}
              {press.featuredImage && (
                <div className="lg:w-2/5">
                  <div className="relative h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src={press.featuredImage}
                      alt={cleanTitle}
                      fill
                      className="object-cover"
                      unoptimized={press.featuredImage.startsWith('http')}
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Title and Metadata */}
              <div className={press.featuredImage ? "lg:w-3/5" : "lg:w-full"}>
                {/* Category + tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {press.categoryName && (
                    <Link href={`/about/press-room?category=${press.categorySlug}`}>
                      <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                        {press.categoryName}
                      </span>
                    </Link>
                  )}
                  {press.tags.slice(0, 3).map((tag) => (
                    <Link key={tag.id} href={`/about/press-room?tag=${tag.slug}`}>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors">
                        <Tag className="h-3 w-3" />
                        {tag.name}
                      </span>
                    </Link>
                  ))}
                </div>
                
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                  {cleanTitle}
                </h1>
                
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {press.authorName && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>{press.authorName}</span>
                    </div>
                  )}
                  {press.publishedAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(press.publishedAt)}</span>
                    </div>
                  )}
                  {press.readingTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{press.readingTime} min read</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── Share bar ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-8 px-4 py-3 bg-secondary/30 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Share this release
            </div>
            <div className="flex items-center gap-1">
              {[
                { key: "facebook", Icon: Facebook },
                { key: "twitter",  Icon: Twitter },
                { key: "linkedin", Icon: Linkedin },
                { key: "email",    Icon: Mail },
              ].map(({ key, Icon }) => (
                <Button key={key} variant="ghost" size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleShare(key, pageUrl, cleanTitle)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Summary (if available) ──────────────────────────────────────── */}
          {press.summary && (
            <p className="text-base sm:text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-4 mb-8 leading-relaxed">
              {press.summary}
            </p>
          )}

          {/* ── Gallery-only message ────────────────────────────────────────── */}
          {isGalleryOnlyPost && (
            <div className="bg-muted/30 p-6 rounded-lg border mb-8">
              <h3 className="text-lg font-semibold mb-2">Media Gallery</h3>
              <p className="text-muted-foreground">
                This press release contains a gallery of images. Scroll down to view the complete collection.
              </p>
            </div>
          )}

          {/* ── Main content — processed ────────────────────────────────────── */}
          <div 
            className="prose prose-lg max-w-none 
              prose-headings:text-foreground 
              prose-p:text-foreground/90 
              prose-strong:text-foreground 
              prose-a:text-primary hover:prose-a:text-primary/80
              prose-li:text-foreground/90
              prose-img:rounded-lg prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: processContent(press.content, isGalleryOnlyPost) }}
          />

          {/* ── Gallery Section ──────────────────────────────────────────────── */}
          {galleryImages.length > 0 && (
            <div className="mt-12 mb-8">
              <h3 className="text-xl font-bold mb-6">Gallery ({galleryImages.length} images)</h3>
              {isGalleryOnlyPost && (
                <p className="text-muted-foreground mb-4">
                  This press release showcases the following images:
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages.map((img, index) => (
                  <div key={index} className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image
                        src={img}
                        alt={`Gallery image ${index + 1} for ${cleanTitle}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate">
                          Image {index + 1} of {galleryImages.length}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tags footer ─────────────────────────────────────────────────── */}
          {press.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {press.tags.map((tag) => (
                  <Link key={tag.id} href={`/about/press-room?tag=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Share bar (bottom) ──────────────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-between px-4 py-3 bg-secondary/30 rounded-xl">
            <span className="text-sm font-medium">Found this helpful? Share it.</span>
            <div className="flex items-center gap-1">
              {[
                { key: "facebook", Icon: Facebook },
                { key: "twitter",  Icon: Twitter },
                { key: "linkedin", Icon: Linkedin },
              ].map(({ key, Icon }) => (
                <Button key={key} variant="ghost" size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleShare(key, pageUrl, cleanTitle)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Related press releases ──────────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">
                More Press Releases
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/about/press-room/${item.slug}`}
                    className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border flex flex-col h-full">
                    <div className="relative h-40 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                      {item.featuredImage ? (
                        <Image src={item.featuredImage} alt={item.title} fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                          <span className="text-white/40 text-5xl font-display">{item.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      {item.categoryName && (
                        <span className="inline-block mb-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                          {item.categoryName}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-grow leading-relaxed">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.publishedAt)}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:text-accent transition-colors">
                          Read <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Back button ─────────────────────────────────────────────────── */}
          <div className="mt-12 text-center">
            <Link href="/about/press-room">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to All Press Releases
              </Button>
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}