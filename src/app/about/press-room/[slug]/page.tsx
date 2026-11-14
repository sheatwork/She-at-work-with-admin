// app/about/press-room/[slug]/page.tsx
// NO "use client" — Server Component + ISR 300s.
//
// Changes vs original:
//   REMOVED  "use client", useState, useEffect, isLoading spinner, pageUrl state,
//            galleryImages state, isGalleryOnlyPost state, extractGalleryImages (moved to fetchDetail.ts)
//   ADDED    export const revalidate, generateMetadata, async server fetch
//   KEPT     All JSX including gallery grid, side-by-side layout, processContent, isGalleryOnly check
//   Gallery images are now extracted server-side via extractGalleryImages() in fetchDetail.ts

import {
 formatDate,
  extractGalleryImages, processWordPressContent,
  fetchContentDetailFromDB,
} from "@/components/content/fetchDetail";
import { fetchSlugsByContentType } from "@/db/content";
import { ShareBar } from "@/components/content/ShareBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// NEON CU: cache indefinitely — do NOT put a time on this.
//
// Neon bills for wall-clock time the compute is awake and only suspends after
// ~5 minutes with zero queries. With ~1900 published articles, ANY finite
// revalidate turns crawler traffic into a steady drip of background
// regenerations (1900 pages / 86400s = one DB query every ~45s even at a
// 24-hour TTL), so the compute never reaches an idle 5-minute window.
//
// `false` is safe here because every write path already pushes an on-demand
// invalidation: revalidateContent() in lib/revalidate.ts is called from
// POST/PATCH/DELETE /api/admin/content and the story-submission publish route.
// Edits still go live instantly; nothing regenerates on a timer.
export const revalidate = false;

// Registers this dynamic segment for ISR. Without it Next.js renders the
// route on demand for every request and caches nothing.
export async function generateStaticParams() {
  const slugs = await fetchSlugsByContentType("PRESS");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchContentDetailFromDB(slug);
  if (!data) return { title: "Press Room | She At Work" };
  const t = data.item.title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
  return {
    title: `${t} | She At Work`,
    description: data.item.summary ?? `Read the press release on She At Work.`,
    openGraph: { title: t, description: data.item.summary ?? undefined, images: data.item.featuredImage ? [data.item.featuredImage] : undefined },
  };
}

function isGalleryOnly(content: string | null, galleryImages: string[]): boolean {
  if (!content) return false;
  const clean = content.replace(/<[^>]*>/g, "").trim();
  return clean.length < 50 && galleryImages.length > 0;
}

export default async function PressDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchContentDetailFromDB(slug);
  if (!data) notFound();

  const { item: press, related } = data;

  // These run on the server — no window/DOM needed
  const galleryImages   = extractGalleryImages(press.content);
  const galleryOnly     = isGalleryOnly(press.content, galleryImages);
  const processedContent = processWordPressContent(galleryOnly ? null : press.content);
  const cleanTitle      = press.title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&") || "Untitled Press Release";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">

        {/* Back nav */}
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/about/press-room">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />Back to Press Room
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Header — side-by-side layout kept from original */}
          <header className="mb-8 lg:mb-12">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

              {press.featuredImage && (
                <div className="lg:w-2/5">
                  <div className="relative h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg">
                    <Image src={press.featuredImage} alt={cleanTitle} fill className="object-cover" priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px" />
                  </div>
                </div>
              )}

              <div className={press.featuredImage ? "lg:w-3/5" : "lg:w-full"}>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {press.categoryName && (
                    <Link prefetch={false} href={`/about/press-room?category=${press.categorySlug}`}>
                      <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                        {press.categoryName}
                      </span>
                    </Link>
                  )}
                  {press.tags.slice(0, 3).map((tag) => (
                    <Link prefetch={false} key={tag.id} href={`/about/press-room?tag=${tag.slug}`}>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors">
                        <Tag className="h-3 w-3" />{tag.name}
                      </span>
                    </Link>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                  {cleanTitle}
                </h1>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {press.authorName && <div className="flex items-center gap-1.5"><User className="h-4 w-4" /><span>{press.authorName}</span></div>}
                  {press.publishedAt && <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>{formatDate(press.publishedAt)}</span></div>}
                  {press.readingTime && <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>{press.readingTime} min read</span></div>}
                </div>
              </div>
            </div>
          </header>

          {/* ↓ Client islands */}
          <div className="mb-8">
            <ShareBar title={cleanTitle} label="Share this release" emailPrefix="Check out this press release" />
          </div>

          {press.summary && (
            <p className="text-base sm:text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-4 mb-8 leading-relaxed">
              {press.summary}
            </p>
          )}

          {galleryOnly && (
            <div className="bg-muted/30 p-6 rounded-lg border mb-8">
              <h3 className="text-lg font-semibold mb-2">Media Gallery</h3>
              <p className="text-muted-foreground">
                This press release contains a gallery of images. Scroll down to view the complete collection.
              </p>
            </div>
          )}

          <div className="prose prose-lg max-w-none
            prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground
            prose-a:text-primary hover:prose-a:text-primary/80 prose-li:text-foreground/90
            prose-img:rounded-lg prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div className="mt-12 mb-8">
              <h3 className="text-xl font-bold mb-6">Gallery ({galleryImages.length} images)</h3>
              {galleryOnly && (
                <p className="text-muted-foreground mb-4">This press release showcases the following images:</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryImages.map((img, index) => (
                  <div key={index} className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image src={img} alt={`Gallery image ${index + 1} for ${cleanTitle}`} fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate">Image {index + 1} of {galleryImages.length}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {press.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {press.tags.map((tag) => (
                  <Link prefetch={false} key={tag.id} href={`/about/press-room?tag=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Tag className="h-3 w-3" />{tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <ShareBar title={cleanTitle} label="Found this helpful? Share it." compact emailPrefix="Check out this press release" />
          </div>

          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">More Press Releases</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link prefetch={false} key={item.id} href={`/about/press-room/${item.slug}`}
                    className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border flex flex-col h-full">
                    <div className="relative h-40 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                      {item.featuredImage
                        ? <Image src={item.featuredImage} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="33vw" />
                        : <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center"><span className="text-white/40 text-5xl font-display">{item.title.charAt(0)}</span></div>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      {item.categoryName && (
                        <span className="inline-block mb-2 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">{item.categoryName}</span>
                      )}
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
            <Link href="/about/press-room"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to All Press Releases</Button></Link>
          </div>
        </article>
      </main>
    </>
  );
}