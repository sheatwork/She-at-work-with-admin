// NO "use client" — server component
import { CloudinaryImage } from "@/components/common/CloudinaryImage";
import Link from "next/link";
import { Calendar, ChevronRight, Clock, ExternalLink, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";

import { formatDate } from "./utils";
import type { BaseContentItem, EntreChatItem, ContentPageConfig } from "./types";
import { getCategoryIcon } from "./categoryIcons";

type Props = {
  featuredItem:    BaseContentItem | EntreChatItem | null;
  latestItems:     (BaseContentItem | EntreChatItem)[];
  config:          ContentPageConfig;
  /** Called by "View All" button — needs JS, so passed as a client wrapper */
  gridSectionId:   string;
};

function isEntreChat(item: BaseContentItem | EntreChatItem): item is EntreChatItem {
  return "interviewee" in item;
}

export function FeaturedSection({ featuredItem, latestItems, config }: Props) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/30">
      <div className="max-w-screen-xl mx-auto grid lg:grid-cols-3 gap-6 sm:gap-8">

        {/* ── Featured Card ─────────────────────────────────────────────── */}
        {featuredItem && (
          <div className="lg:col-span-2">
            <Link prefetch={false}
              href={`/${config.slug}/${featuredItem.slug}`}
              className="block relative group bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-primary/10"
            >
              {/* Badge */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
                <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-bold uppercase shadow-lg">
                  {config.featuredLabel}
                </span>
              </div>

              {/* Image */}
              <div className="relative h-40 sm:h-64 lg:h-[340px] bg-gradient-to-br from-muted to-secondary">
                {featuredItem.featuredImage ? (
                  <CloudinaryImage
                    src={featuredItem.featuredImage}
                    alt={featuredItem.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <div className="text-white/40 text-6xl font-display">
                      {isEntreChat(featuredItem)
                        ? (featuredItem.interviewee?.charAt(0) ?? featuredItem.title.charAt(0))
                        : featuredItem.title.charAt(0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  {featuredItem.categoryName && (
                    <span className="inline-flex items-center gap-1 px-2 sm:px-3 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                      {getCategoryIcon(featuredItem.categoryName)}
                      {featuredItem.categoryName}
                    </span>
                  )}
                  {/* Author / Interviewee */}
                  {isEntreChat(featuredItem) && featuredItem.interviewee ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />{featuredItem.interviewee}
                    </span>
                  ) : featuredItem.authorName ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />{featuredItem.authorName.split(" ")[0]}
                    </span>
                  ) : null}
                </div>

                <h2 className="text-lg sm:text-xl font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {featuredItem.title}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-2 leading-relaxed line-clamp-3">
                  {isEntreChat(featuredItem)
                    ? (featuredItem.summary ?? featuredItem.excerpt)
                    : featuredItem.summary}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      {formatDate(featuredItem.publishedAt)}
                    </div>
                    {featuredItem.readingTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                        {featuredItem.readingTime} min read
                      </div>
                    )}
                    {isEntreChat(featuredItem) && (featuredItem.state || featuredItem.country) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                        {featuredItem.state || featuredItem.country}
                      </div>
                    )}
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-sm sm:text-base w-full sm:w-auto group/btn">
                    {config.featuredCta}
                    <ExternalLink className="ml-2 h-3 w-3 sm:h-4 sm:w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Latest Sidebar ────────────────────────────────────────────── */}
        <div className={!featuredItem ? "lg:col-span-3" : ""}>
          <div className="bg-card rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 shadow-lg border border-border lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              <h3 className="text-lg sm:text-xl font-display font-bold text-foreground">
                {config.sidebarTitle}
              </h3>
            </div>

            <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3 sm:space-y-4">
                {latestItems.map((item, i) => (
                  <Link prefetch={false}
                    key={item.id}
                    href={`/${config.slug}/${item.slug}`}
                    className="block pb-3 sm:pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 relative h-12 w-12 sm:h-14 sm:w-14 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-secondary">
                        {item.featuredImage ? (
                          <CloudinaryImage
                            src={item.featuredImage}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            loading="eager"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                            <span className="text-primary/40 text-lg font-display">
                              {item.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        {/* Rank badge */}
                        <div className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                          {i + 1}
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase tracking-wide">
                            {getCategoryIcon(item.categoryName ?? "")}
                            <span className="truncate max-w-[60px]">
                              {(item.categoryName ?? "Content").split(" ")[0]}
                            </span>
                          </span>
                          {isEntreChat(item) && item.interviewee && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />{item.interviewee.split(" ")[0]}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-1.5 leading-snug line-clamp-2">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.publishedAt)}
                          {isEntreChat(item) && item.state && (
                            <>
                              <MapPin className="h-3 w-3 ml-2" />
                              <span className="truncate max-w-[60px]">{item.state}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* View All — client-side scroll handled by ContentFiltersClient */}
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={`/${config.slug}`}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-accent hover:bg-accent/10 rounded-lg transition-colors"
              >
                {config.viewAllLabel}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}