// app/entrechat/[slug]/page.tsx
// NO "use client" — Server Component + ISR 300s.
//
// Changes vs original:
//   REMOVED  "use client", useState, useEffect, isLoading spinner, pageUrl state
//   ADDED    export const revalidate, generateMetadata, async server fetch
//   KEPT     All JSX including EntrechatPostContent client island, industry chips,
//            interviewee highlight card, getCategoryIcon, all EntreChat-specific fields

import { fetchContentDetail, formatDate } from "@/components/content/fetchDetail";
import { getCategoryIcon } from "@/components/content/categoryIcons";
import { ShareBar } from "@/components/content/ShareBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import EntrechatPostContent from "@/components/enterchat/EntrechatPostContent";
import {
  ArrowLeft, ArrowRight, Building, Calendar, Clock,
  FileText, Globe, MapPin, Tag, TrendingUp, User, Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 300;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) return { title: "EntreChat | She At Work" };
  const t = data.item.title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
  return {
    title: `${t} | She At Work`,
    description: data.item.summary ?? `Watch the interview on She At Work.`,
    openGraph: { title: t, description: data.item.summary ?? undefined, images: data.item.featuredImage ? [data.item.featuredImage] : undefined },
  };
}

export default async function EntrechatDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) notFound();

  const { item: interview, related } = data;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-28">

        {/* Sticky back nav */}
        <div className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/entrechat">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />Back to EntreChat
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ">

          <header className="mb-8">
            {/* Category + format + tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {interview.categoryName && (
                <Link href={`/entrechat?category=${interview.categorySlug}`}>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase hover:bg-primary/20 transition-colors">
                    {getCategoryIcon(interview.categoryName)}{interview.categoryName}
                  </span>
                </Link>
              )}
              {interview.interviewFormat && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
                  <Video className="h-3 w-3" />{interview.interviewFormat}
                </span>
              )}
              {interview.tags.slice(0, 3).map((tag) => (
                <Link key={tag.id} href={`/entrechat?tag=${tag.slug}`}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] hover:bg-primary/10 hover:text-primary transition-colors">
                    <Tag className="h-3 w-3" />{tag.name}
                  </span>
                </Link>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
              {interview.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {interview.interviewee && <div className="flex items-center gap-1.5"><User className="h-4 w-4" /><span>With {interview.interviewee}</span></div>}
              {interview.publishedAt && <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>{formatDate(interview.publishedAt)}</span></div>}
              {interview.readingTime && <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>{interview.readingTime} min read</span></div>}
            </div>

            {/* Industry / stage / region chips — kept from original */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {interview.industrySector && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  <Building className="h-3 w-3" />{interview.industrySector}
                </span>
              )}
              {interview.businessStage && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                  <TrendingUp className="h-3 w-3" />{interview.businessStage}
                </span>
              )}
              {interview.founderRegion && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">
                  <Globe className="h-3 w-3" />{interview.founderRegion}
                </span>
              )}
              {interview.successFactor && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                  <FileText className="h-3 w-3" />{interview.successFactor}
                </span>
              )}
              {(interview.state || interview.country) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                  <MapPin className="h-3 w-3" />{interview.state || interview.country}
                </span>
              )}
            </div>
          </header>

          {interview.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full h-64 sm:h-80 lg:h-[420px]">
                <Image src={interview.featuredImage} alt={interview.title} fill className="object-cover" priority sizes="(max-width: 896px) 100vw, 896px" />
              </div>
            </div>
          )}

          {/* ↓ Client islands */}
          <div className="mb-8">
            <ShareBar title={interview.title} label="Share this interview" emailPrefix="Check out this interview" />
          </div>

          {interview.summary && (
            <p className="text-base sm:text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-4 mb-8 leading-relaxed">
              {interview.summary}
            </p>
          )}

          {/* EntrechatPostContent uses isomorphic-dompurify — must stay "use client". Renders as client island. */}
          <div className="wordpress-content mb-12">
            <EntrechatPostContent content={interview.content} />
          </div>

          {/* Interviewee highlight card */}
          {interview.interviewee && (
            <div className="mt-12 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                  {interview.interviewee.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">About {interview.interviewee}</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    In this exclusive EntreChat interview, {interview.interviewee} shares valuable insights,
                    experiences, and advice for aspiring entrepreneurs and professionals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {interview.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Topics</p>
              <div className="flex flex-wrap gap-2">
                {interview.tags.map((tag) => (
                  <Link key={tag.id} href={`/entrechat?tag=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Tag className="h-3 w-3" />{tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <ShareBar title={interview.title} label="Found this helpful? Share it." compact emailPrefix="Check out this interview" />
          </div>

          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">Related Interviews</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/entrechat/${item.slug}`}
                    className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border flex flex-col h-full">
                    <div className="relative h-40 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
                      {item.featuredImage
                        ? <Image src={item.featuredImage} alt={item.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="33vw" />
                        : <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center"><span className="text-white/40 text-5xl font-display">{item.interviewee?.charAt(0) ?? "E"}</span></div>}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        {item.categoryName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                            {getCategoryIcon(item.categoryName)}{item.categoryName}
                          </span>
                        )}
                        {item.readingTime && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{item.readingTime} min
                          </span>
                        )}
                      </div>
                      {item.interviewee && (
                        <span className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" />{item.interviewee}
                        </span>
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
            <Link href="/entrechat"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to All Interviews</Button></Link>
          </div>
        </article>
      </main>
    </>
  );
}