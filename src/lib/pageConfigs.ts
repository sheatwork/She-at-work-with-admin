import type { ContentPageConfig } from "@/components/content/types";

// ─── Existing configs ──────────────────────────────────────────────────────────

export const newsConfig: ContentPageConfig = {
  contentType:       "NEWS",
  slug:              "news",
  bannerDesktop:     "/news/finalNewsbanner.webp",
  bannerMobile:      "/news/mobileBannernews.webp",
  bannerAlt:         "News Banner",
  bannerTitle:       "Women in Business News",
  bannerSubtitle:    "Stay informed with the latest news, insights, and success stories from women entrepreneurs worldwide",
  featuredLabel:     "Featured Story",
  sidebarTitle:      "Latest Headlines",
  gridTitle:         "All News Articles",
  searchPlaceholder: "Search news…",
  filterTitle:       "Filter Articles",
  emptyMessage:      "No articles match the current filters.",
  featuredCta:       "Read Full Story",
  viewAllLabel:      "View All News",
  gridSectionId:     "all-news-section",
};

export const blogsConfig: ContentPageConfig = {
  contentType:       "BLOG",
  slug:              "blogs",
  bannerDesktop:     "/blogs/finalBlogsbanner.webp",
  bannerMobile:      "/blogs/mobileBlogs.webp",
  bannerAlt:         "Blogs Banner",
  bannerTitle:       "Inspiring Blogs",
  bannerSubtitle:    "Explore real insights, bold conversations, and practical guidance for women entrepreneurs. From funding and strategy to inspiring journeys, discover ideas that help you start, scale, and grow.",
  featuredLabel:     "Featured Story",
  sidebarTitle:      "Trending Now",
  gridTitle:         "All Blog Articles",
  searchPlaceholder: "Search blogs…",
  filterTitle:       "Filter Articles",
  emptyMessage:      "No articles match the current filters.",
  featuredCta:       "Read Full Article",
  viewAllLabel:      "View All Blogs",
  gridSectionId:     "all-blogs-section",
};

export const entreChatConfig: ContentPageConfig = {
  contentType:       "ENTRECHAT",
  slug:              "entrechat",
  bannerDesktop:     "/entrechat/FinalEntrechatbanner.webp",
  bannerMobile:      "/entrechat/Mobile-Entrechat.webp",
  bannerAlt:         "EntreChat Banner",
  bannerTitle:       "EntreChat Community",
  bannerSubtitle:    "Candid conversations with inspiring women entrepreneurs sharing real journeys and experiences. Discover challenges, strategies, and lessons that inform, inspire, and empower your own path.",
  featuredLabel:     "Featured Interview",
  sidebarTitle:      "Trending Now",
  gridTitle:         "All Interviews",
  searchPlaceholder: "Search interviews…",
  filterTitle:       "Filter Interviews",
  emptyMessage:      "No interviews match the current filters.",
  featuredCta:       "Read Interview",
  viewAllLabel:      "View All Interviews",
  gridSectionId:     "all-interviews-section",
};

// ─── New configs ───────────────────────────────────────────────────────────────
// TODO: Replace banner image paths with your actual assets once uploaded.
// Suggested locations: /public/events/ and /public/press/

export const eventsConfig: ContentPageConfig = {
  contentType:       "EVENT",
  slug:              "events",
  bannerDesktop:     "/events/FinalEventsbanner.webp",   // TODO: upload banner
  bannerMobile:      "/events/Mobile-Events.webp",  // TODO: upload banner
  bannerAlt:         "Events Banner",
  bannerTitle:       "Events & Opportunities",
  bannerSubtitle:    "Discover summits, workshops, networking sessions, and pitching events for women entrepreneurs. Find your next opportunity to connect, learn, and grow.",
  featuredLabel:     "Featured Event",
  sidebarTitle:      "Coming Up",
  gridTitle:         "All Events",
  searchPlaceholder: "Search events…",
  filterTitle:       "Filter Events",
  emptyMessage:      "No events match the current filters.",
  featuredCta:       "View Event Details",
  viewAllLabel:      "View All Events",
  gridSectionId:     "all-events-section",
};

export const pressConfig: ContentPageConfig = {
  contentType:       "PRESS",
  slug:              "press",
  bannerDesktop:     "/press/finalPressbanner.png",     // TODO: upload banner
  bannerMobile:      "/press/mobilePressbanner.png",    // TODO: upload banner
  bannerAlt:         "Press Banner",
  bannerTitle:       "Press & Media",
  bannerSubtitle:    "She At Work in the news. Read the latest press releases, media features, and coverage celebrating women entrepreneurship.",
  featuredLabel:     "Featured Coverage",
  sidebarTitle:      "Latest Press",
  gridTitle:         "All Press Coverage",
  searchPlaceholder: "Search press…",
  filterTitle:       "Filter Coverage",
  emptyMessage:      "No press items match the current filters.",
  featuredCta:       "Read Coverage",
  viewAllLabel:      "View All Press",
  gridSectionId:     "all-press-section",
};