// This component has NO state, no hooks — safe to use in both server and client trees.
// The tag onClick is injected optionally from the client wrapper.

import { CloudinaryImage } from "@/components/common/CloudinaryImage";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin, User } from "lucide-react";

import { formatDate } from "./utils";
import type { BaseContentItem, EntreChatItem } from "./types";
import { getCategoryIcon } from "./categoryIcons";

type Props = {
  item:        BaseContentItem | EntreChatItem;
  href:        string;
  index?:      number;
  onTagClick?: (slug: string) => void;
};

function isEntreChat(item: BaseContentItem | EntreChatItem): item is EntreChatItem {
  return "interviewee" in item;
}

export function ContentCard({ item, href, index = 0, onTagClick }: Props) {
  const ec = isEntreChat(item) ? item : null;

  return (
    <Link prefetch={false}
      href={href}
      className="group bg-card rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 border border-border flex flex-col h-full"
    >
      {/* Image */}
      <div className="relative h-40 sm:h-44 bg-gradient-to-br from-muted to-secondary flex-shrink-0 overflow-hidden">
        {item.featuredImage ? (
          <CloudinaryImage
            src={item.featuredImage}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading={index < 4 ? "eager" : "lazy"}
            priority={index < 2} // Add priority for first 2 images
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <div className="text-white/40 text-5xl font-display">
              {ec?.interviewee?.charAt(0) ?? item.title.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* Rest of your component remains the same */}
      <div className="p-4 sm:p-6 flex flex-col flex-grow">
        {/* Category + Reading time */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase">
            {getCategoryIcon(item.categoryName ?? "")}
            {(item.categoryName ?? "Content").split(" & ")[0]}
          </span>
          {item.readingTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{item.readingTime} min
            </span>
          )}
        </div>

        {/* EntreChat-only: interviewee */}
        {ec?.interviewee && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-medium text-foreground flex items-center gap-1">
              <User className="h-3 w-3" />{ec.interviewee}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm sm:text-base lg:text-lg font-display font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>

        {/* EntreChat badges */}
        {ec && (ec.industrySector || ec.businessStage) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {ec.industrySector && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                {ec.industrySector}
              </span>
            )}
            {ec.businessStage && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]">
                {ec.businessStage}
              </span>
            )}
          </div>
        )}

        {/* Summary */}
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5 line-clamp-2 leading-relaxed flex-grow">
          {ec ? (item.summary ?? ec.excerpt) : item.summary}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, ec ? 2 : 3).map((tag) =>
              onTagClick ? (
                <button
                  key={tag.id}
                  onClick={(e) => { e.preventDefault(); onTagClick(tag.slug); }}
                  className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  #{tag.name}
                </button>
              ) : (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px]"
                >
                  #{tag.name}
                </span>
              )
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border mt-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {formatDate(item.createdAt)}
            </span>
            {ec?.state && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{ec.state}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 -mx-2 -my-1 rounded-md text-primary group-hover:text-accent group-hover:bg-primary/5 transition-colors text-xs">
            Read <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}