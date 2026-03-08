// app/news/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Calendar, Clock,
  Facebook, Linkedin, Mail, Share2, Tag, ExternalLink,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar/Navbar";
import { getCategoryIcon } from "@/components/common/MultiSelectDropdown";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type NewsDetail = {
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
  source: string | null;
  sourceType: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: Tag[];
};

type RelatedItem = Omit<NewsDetail, "content" | "externalUrl" | "categoryId" | "sourceType">;

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
    email:    `mailto:?subject=${enc(title)}&body=${enc(`Check out this news article: ${url}`)}`,
  };
  if (platform === "email") { window.location.href = map.email; return; }
  window.open(map[platform], "_blank");
}

function processNewsContent(content: string, externalUrl: string | null): string {
  if (!externalUrl) return content;

  // Escape URL for JavaScript
  const escapedUrl = externalUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  // Replace "Read more" links with enhanced version
  const readMoreRegex = /<a[^>]*>Read more<\/a>/gi;
  let processed = content.replace(readMoreRegex, () => {
    return `
      <span 
        onclick="window.open('${escapedUrl}', '_blank', 'noopener,noreferrer')"
        class="inline-flex items-center gap-1 text-primary hover:text-accent font-semibold cursor-pointer read-more-link"
        style="transition: color 0.2s ease;"
      >
        Read full article
        <svg class="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
        </svg>
      </span>
    `;
  });

  // If no "Read more" found, add it
  if (!processed.includes('read-more-link')) {
    processed += `
      <div class="mt-6">
        <span 
          onclick="window.open('${escapedUrl}', '_blank', 'noopener,noreferrer')"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors read-more-link"
        >
          Read full article on ${new URL(externalUrl).hostname.replace('www.', '')}
          <ExternalLink className="h-4 w-4" />
        </span>
      </div>
    `;
  }

  return processed;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [news, setNews]             = useState<NewsDetail | null>(null);
  const [related, setRelated]       = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [notFoundFlag, setNotFound] = useState(false);
  const [pageUrl, setPageUrl]       = useState("");
  const [processedContent, setProcessedContent] = useState("");

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
        setNews(data.item);
        setRelated(data.related ?? []);
        
        // Process content for external links
        if (data.item) {
          const processed = processNewsContent(data.item.content, data.item.externalUrl);
          setProcessedContent(processed);
        }
      } catch (err) {
        console.error("News fetch error:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [params]);

  const openExternalLink = () => {
    if (news?.externalUrl) {
      const url = news.externalUrl.startsWith('http') 
        ? news.externalUrl 
        : `https://${news.externalUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // ── States ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading news article…</p>
          </div>
        </div>
      </>
    );
  }

  if (notFoundFlag || !news) return notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">

        {/* ── Back nav ───────────────────────────────────────────────────────── */}
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/news">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to News
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="mb-8">
            {/* Category + source + tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {news.categoryName && (
                <Link href={`/news?category=${news.categorySlug}`}>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                    {getCategoryIcon(news.categoryName)}
                    {news.categoryName}
                  </span>
                </Link>
              )}
              {news.source && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
                  {news.source}
                </span>
              )}
              {news.tags.slice(0, 3).map((tag) => (
                <Link key={tag.id} href={`/news?tag=${tag.slug}`}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] hover:bg-primary/10 hover:text-primary transition-colors">
                    <Tag className="h-3 w-3" />
                    {tag.name}
                  </span>
                </Link>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
              {news.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {news.publishedAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(news.publishedAt)}</span>
                </div>
              )}
              {news.readingTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{news.readingTime} min read</span>
                </div>
              )}
              {news.authorName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">By {news.authorName}</span>
                </div>
              )}
            </div>

            {/* External link button */}
            {news.externalUrl && (
              <div className="mt-4">
                <Button 
                  onClick={openExternalLink}
                  variant="outline"
                  className="gap-2 group"
                >
                  Read Full Article on {new URL(news.externalUrl).hostname.replace('www.', '')}
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}
          </header>

          {/* ── Featured image ──────────────────────────────────────────────── */}
          {news.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full h-64 sm:h-80 lg:h-[420px]">
                <Image
                  src={news.featuredImage}
                  alt={news.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
            </div>
          )}

          {/* ── Share bar ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-8 px-4 py-3 bg-secondary/30 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Share this news
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
                  onClick={() => handleShare(key, pageUrl, news.title)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Summary (excerpt) ───────────────────────────────────────────── */}
          {news.summary && (
            <div className="mb-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <p className="text-lg font-medium text-foreground italic leading-relaxed">
                {news.summary}
              </p>
            </div>
          )}

          {/* ── Main content — processed with external link handling ───────── */}
          <div 
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
                      mb-12
                      [&_.read-more-link]:inline-flex [&_.read-more-link]:items-center [&_.read-more-link]:gap-1 
                      [&_.read-more-link]:text-primary [&_.read-more-link]:font-semibold
                      [&_.read-more-link]:cursor-pointer
                      [&_.read-more-link:hover]:text-accent"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />

          {/* ── Tags footer ─────────────────────────────────────────────────── */}
          {news.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Topics</p>
              <div className="flex flex-wrap gap-2">
                {news.tags.map((tag) => (
                  <Link key={tag.id} href={`/news?tag=${tag.slug}`}>
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
                  onClick={() => handleShare(key, pageUrl, news.title)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Related news ────────────────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">
                Related News
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/news/${item.slug}`}
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
                      <div className="flex items-center justify-between mb-2">
                        {item.categoryName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                            {getCategoryIcon(item.categoryName)}
                            {item.categoryName}
                          </span>
                        )}
                        {item.source && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                            {item.source}
                          </span>
                        )}
                      </div>
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
            <Link href="/news">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to All News
              </Button>
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}