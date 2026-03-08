// app/blogs/[slug]/page.tsx
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
import BlogPostContent from "@/components/blogs/BlogPostContent";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ApiTag = { id: string; name: string; slug: string };

type BlogDetail = {
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
};

type RelatedItem = Omit<BlogDetail, "content" | "externalUrl" | "contentType" | "categoryId">;

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
    email:    `mailto:?subject=${enc(title)}&body=${enc(`Check out this article: ${url}`)}`,
  };
  if (platform === "email") { window.location.href = map.email; return; }
  window.open(map[platform], "_blank");
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [blog, setBlog]             = useState<BlogDetail | null>(null);
  const [related, setRelated]       = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [notFoundFlag, setNotFound] = useState(false);
  const [pageUrl, setPageUrl]       = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // ── Unwrap params + fetch in one effect ──────────────────────────────────────
  // Previously: 2 effects (unwrap params → set slug → trigger second effect)
  // caused an extra render cycle keeping the loader visible longer than needed.
  useEffect(() => {
    (async () => {
      try {
        const { slug } = await params;
        const res = await fetch(`/api/content/${slug}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setBlog(data.item);
        setRelated(data.related ?? []);
      } catch (err) {
        console.error("Blog fetch error:", err);
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
            <p className="text-muted-foreground">Loading article…</p>
          </div>
        </div>
      </>
    );
  }

  if (notFoundFlag || !blog) return notFound();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">

        {/* ── Back nav ───────────────────────────────────────────────────────── */}
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/blogs">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Blogs
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="mb-8">
            {/* Category + tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {blog.categoryName && (
                <Link href={`/blogs?category=${blog.categorySlug}`}>
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                    {blog.categoryName}
                  </span>
                </Link>
              )}
              {blog.tags.slice(0, 4).map((tag) => (
                <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] hover:bg-primary/10 hover:text-primary transition-colors">
                    <Tag className="h-3 w-3" />
                    {tag.name}
                  </span>
                </Link>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
              {blog.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {blog.authorName && (
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  <span>{blog.authorName}</span>
                </div>
              )}
              {blog.publishedAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(blog.publishedAt)}</span>
                </div>
              )}
              {blog.readingTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{blog.readingTime} min read</span>
                </div>
              )}
            </div>
          </header>

          {/* ── Featured image ──────────────────────────────────────────────── */}
          {blog.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full h-64 sm:h-80 lg:h-[420px]">
                <Image
                  src={blog.featuredImage}
                  alt={blog.title}
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
              Share this article
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
                  onClick={() => handleShare(key, pageUrl, blog.title)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Summary (optional teaser) ───────────────────────────────────── */}
          {blog.summary && (
            <p className="text-base sm:text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-4 mb-8 leading-relaxed">
              {blog.summary}
            </p>
          )}

          {/* ── Main content — processed via BlogWordPressConverter ────────── */}
          <BlogPostContent content={blog.content} />

          {/* ── Tags footer ─────────────────────────────────────────────────── */}
          {blog.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
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
                  onClick={() => handleShare(key, pageUrl, blog.title)}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* ── Related articles ────────────────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/blogs/${item.slug}`}
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
            <Link href="/blogs">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to All Blogs
              </Button>
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}