// app/events/[slug]/page.tsx
// NO "use client" — Server Component + ISR 300s.
//
// Changes vs original:
//   REMOVED  "use client", useState, useEffect, framer-motion (motion.*, AnimatedText, ScrollFade,
//            Variants, imageLoaded state), isLoading spinner, pageUrl state, slug state
//   ADDED    export const revalidate, generateMetadata, async server fetch
//   KEPT     All JSX structure, all event extraction helpers (now from fetchDetail.ts),
//            openEventRegistrationEmail CTA, externalUrl CTA, related events grid
//   NOTE     openEventRegistrationEmail needs window — wrapped in EventCTA client island below

import {
  extractEventCategory, extractEventDate, extractEventFormat,
  extractEventLocation, extractEventPrice,
  fetchContentDetail
} from "@/components/content/fetchDetail";
import { ShareBar } from "@/components/content/ShareBar";
import { EventCTA } from "@/components/events/EventCTA";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, IndianRupee, MapPin, Tag, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) return { title: "Events | She At Work" };
  const t = data.item.title.replace(/&amp;/g, "&");
  return {
    title: `${t} | She At Work`,
    description: data.item.summary ?? `Event details on She At Work.`,
    openGraph: { title: t, description: data.item.summary ?? undefined, images: data.item.featuredImage ? [data.item.featuredImage] : undefined },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) notFound();

  const { item, related } = data;

  // All extraction runs on the server — no window/DOM needed
  const sourceText = item.content ?? item.summary ?? "";
  const title    = item.title.replace(/&amp;/g, "&");
  const category = extractEventCategory(item.categoryName, sourceText);
  const location = extractEventLocation(sourceText);
  const date     = extractEventDate(sourceText, item.publishedAt);
  const format   = extractEventFormat(sourceText);
  const price    = extractEventPrice(sourceText);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">

        {/* Back nav */}
        <div className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/events">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />Back to Events
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase">
                {category}
              </span>
              <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold uppercase">
                {format}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
              {title}
            </h1>

            {/* Meta grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                <div><p className="text-sm text-muted-foreground">Date</p><p className="font-medium text-foreground">{date}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div><p className="text-sm text-muted-foreground">Location</p><p className="font-medium text-foreground">{location}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary flex-shrink-0" />
                <div><p className="text-sm text-muted-foreground">Format</p><p className="font-medium text-foreground">{format}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <IndianRupee className="h-5 w-5 text-accent flex-shrink-0" />
                <div><p className="text-sm text-muted-foreground">Price</p><p className="font-medium text-foreground">{price}</p></div>
              </div>
            </div>

            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {item.tags.map((tag) => (
                  <span key={tag.id} className="px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground font-medium">
                    <Tag className="h-3 w-3 inline mr-1" />#{tag.name}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Featured image — plain <img> kept (original used motion.img + onLoad state) */}
          {item.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.featuredImage} alt={title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* ↓ Client islands */}
          <div className="mb-8">
            <ShareBar title={title} label="Share this event:" emailPrefix="Check out this event" />
          </div>

          {/* Full content */}
          <div className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:font-bold
            prose-p:text-foreground/80 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:font-bold prose-strong:text-foreground
            prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 mb-12"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          {/* External URL CTA */}
          {item.externalUrl && (
            <div className="mb-8 p-4 bg-secondary/30 rounded-lg flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Official event page available</p>
              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Visit Official Page
                </Button>
              </a>
            </div>
          )}

          {/* Contact CTA — client island (openEventRegistrationEmail uses window) */}
          <EventCTA title={title} date={date} location={location} format={format} price={price} category={category} />

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16 pt-8 border-t">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">Related Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((rel) => {
                  const relCategory = extractEventCategory(rel.categoryName, rel.summary ?? "");
                  const relLocation = extractEventLocation(rel.summary ?? "");
                  const relDate = extractEventDate(rel.summary ?? "", rel.publishedAt);

                  return (
                    <Link key={rel.id} href={`/events/${rel.slug}`} className="group">
                      <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border h-full hover:-translate-y-1">
                        <div className="h-48 bg-gradient-to-br from-muted to-secondary bg-cover bg-center relative overflow-hidden"
                          style={{ backgroundImage: rel.featuredImage ? `url(${rel.featuredImage})` : undefined }}>
                          {!rel.featuredImage && (
                            <>
                              <div className="h-full flex items-center justify-center text-white/40 text-4xl font-display">
                                {rel.title.charAt(0)}
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-50" />
                            </>
                          )}
                        </div>
                        <div className="p-4">
                          <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2 uppercase">
                            {relCategory}
                          </span>
                          <h3 className="font-display font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {rel.title.replace(/&amp;/g, "&")}
                          </h3>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{relDate}</span></div>
                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="line-clamp-1">{relLocation}</span></div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/events"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to All Events</Button></Link>
          </div>
        </article>
      </main>
    </>
  );
}