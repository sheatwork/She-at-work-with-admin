// app/news/[slug]/page.tsx
// NO "use client" — Server Component + ISR 300s.
//
// Changes vs original:
//   REMOVED  "use client", useState, useEffect, isLoading spinner, pageUrl state
//   ADDED    export const revalidate, generateMetadata, async server fetch
//   KEPT     All JSX, processNewsContent, source badge, getCategoryIcon import

import { fetchContentDetail, formatDate } from "@/components/content/fetchDetail";

import { ShareBar } from "@/components/content/ShareBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryIcon } from "@/components/content/categoryIcons";

export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) return { title: "News | She At Work" };
  const t = data.item.title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
  return {
    title: `${t} | She At Work`,
    description: data.item.summary ?? `Read ${t} on She At Work.`,
    openGraph: { title: t, description: data.item.summary ?? undefined, images: data.item.featuredImage ? [data.item.featuredImage] : undefined },
  };
}

// Kept exactly from original — processes externalUrl into content
function processNewsContent(content: string, externalUrl: string | null): string {
  if (!externalUrl) return content;
  let hostname = "source";
  try { hostname = new URL(externalUrl).hostname.replace("www.", ""); } catch { /**/ }
  const esc = externalUrl.replace(/'/g, "\\'").replace(/"/g, "&quot;");
  let out = content.replace(/<a[^>]*>Read more<\/a>/gi,
    `<span onclick="window.open('${esc}','_blank','noopener,noreferrer')" class="inline-flex items-center gap-1 text-primary hover:text-accent font-semibold cursor-pointer read-more-link" style="transition:color 0.2s ease">Read full article<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></span>`
  );
  if (!out.includes("read-more-link")) {
    out += `<div class="mt-6"><span onclick="window.open('${esc}','_blank','noopener,noreferrer')" class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors read-more-link">Read full article on ${hostname}</span></div>`;
  }
  return out;
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) notFound();

  const { item: news, related } = data;
  const processedContent = processNewsContent(news.content, news.externalUrl);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {news.categoryName && (
                <Link href={`/news?category=${news.categorySlug}`}>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                    {getCategoryIcon(news.categoryName)}{news.categoryName}
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
                    <Tag className="h-3 w-3" />{tag.name}
                  </span>
                </Link>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
              {news.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {news.publishedAt && <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>{formatDate(news.publishedAt)}</span></div>}
              {news.readingTime && <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>{news.readingTime} min read</span></div>}
              {news.authorName && <span>By {news.authorName}</span>}
            </div>
          </header>

          {news.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full h-64 sm:h-80 lg:h-[420px]">
                <Image src={news.featuredImage} alt={news.title} fill className="object-cover" priority sizes="(max-width: 896px) 100vw, 896px" />
              </div>
            </div>
          )}

          {/* ↓ Only client island on this page */}
          <div className="mb-8">
            <ShareBar title={news.title} label="Share this news" emailPrefix="Check out this news article" />
          </div>

          {news.summary && (
            <div className="mb-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <p className="text-lg font-medium text-foreground italic leading-relaxed">{news.summary}</p>
            </div>
          )}

          <div className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:font-bold
            prose-p:text-foreground/80 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:font-bold prose-strong:text-foreground
            prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 mb-12
            [&_.read-more-link]:inline-flex [&_.read-more-link]:items-center [&_.read-more-link]:gap-1
            [&_.read-more-link]:text-primary [&_.read-more-link]:font-semibold [&_.read-more-link]:cursor-pointer
            [&_.read-more-link:hover]:text-accent"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />

          {news.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Topics</p>
              <div className="flex flex-wrap gap-2">
                {news.tags.map((tag) => (
                  <Link key={tag.id} href={`/news?tag=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Tag className="h-3 w-3" />{tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <ShareBar title={news.title} label="Found this helpful? Share it." compact emailPrefix="Check out this news article" />
          </div>

          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">Related News</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/news/${item.slug}`}
                    className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border flex flex-col h-full">
                    <div className="relative h-40 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                      {item.featuredImage
                        ? <Image src={item.featuredImage} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="33vw" />
                        : <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center"><span className="text-white/40 text-5xl font-display">{item.title.charAt(0)}</span></div>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        {item.categoryName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                            {getCategoryIcon(item.categoryName)}{item.categoryName}
                          </span>
                        )}
                        {item.source && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{item.source}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                      {item.summary && <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">{item.summary}</p>}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{formatDate(item.publishedAt)}</div>
                        <span className="inline-flex items-center gap-1 text-xs text-primary group-hover:text-accent transition-colors">Read <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="mt-12 text-center">
            <Link href="/news"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to All News</Button></Link>
          </div>
        </article>
      </main>
    </>
  );
}