// app/blogs/[slug]/page.tsx
// NO "use client" — Server Component + ISR 300s.
//
// Changes vs original:
//   REMOVED  "use client", useState, useEffect, isLoading spinner, pageUrl state
//   ADDED    export const revalidate, generateMetadata, async server fetch
//   KEPT     All JSX, sticky back nav, BlogPostContent (still "use client" — untouched)

import { fetchContentDetail, formatDate } from "@/components/content/fetchDetail";
import { ShareBar } from "@/components/content/ShareBar";
import { Navbar } from "@/components/navbar/Navbar";
import { Button } from "@/components/ui/button";
import BlogPostContent from "@/components/blogs/BlogPostContent";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag, User } from "lucide-react";
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
  if (!data) return { title: "Blog | She At Work" };
  const t = data.item.title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
  return {
    title: `${t} | She At Work`,
    description: data.item.summary ?? `Read ${t} on She At Work.`,
    openGraph: { title: t, description: data.item.summary ?? undefined, images: data.item.featuredImage ? [data.item.featuredImage] : undefined },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await fetchContentDetail(slug);
  if (!data) notFound();

  const { item: blog, related } = data;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-28">

        {/* Sticky back nav */}
        <div className=" bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link href="/blogs">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />Back to Blogs
              </Button>
            </Link>
          </div>
        </div>

        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ">

          <header className="mb-8">
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
                    <Tag className="h-3 w-3" />{tag.name}
                  </span>
                </Link>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-5 leading-tight">
              {blog.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {blog.authorName && <div className="flex items-center gap-1.5"><User className="h-4 w-4" /><span>{blog.authorName}</span></div>}
              {blog.publishedAt && <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /><span>{formatDate(blog.publishedAt)}</span></div>}
              {blog.readingTime && <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" /><span>{blog.readingTime} min read</span></div>}
            </div>
          </header>

          {blog.featuredImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
              <div className="relative w-full h-64 sm:h-80 lg:h-[420px]">
                <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover" priority sizes="(max-width: 896px) 100vw, 896px" />
              </div>
            </div>
          )}

          {/* ↓ Client islands */}
          <div className="mb-8">
            <ShareBar title={blog.title} label="Share this article" emailPrefix="Check out this article" />
          </div>

          {blog.summary && (
            <p className="text-base sm:text-lg text-muted-foreground italic border-l-4 border-primary/30 pl-4 mb-8 leading-relaxed">
              {blog.summary}
            </p>
          )}

          {/* BlogPostContent uses DOMPurify — must stay "use client". Renders as client island here. */}
          <BlogPostContent content={blog.content} />

          {blog.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Link key={tag.id} href={`/blogs?tag=${tag.slug}`}>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Tag className="h-3 w-3" />{tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <ShareBar title={blog.title} label="Found this helpful? Share it." compact emailPrefix="Check out this article" />
          </div>

          {related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {related.map((item) => (
                  <Link key={item.id} href={`/blogs/${item.slug}`}
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
            <Link href="/blogs"><Button variant="outline" size="lg" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to All Blogs</Button></Link>
          </div>
        </article>
      </main>
    </>
  );
}