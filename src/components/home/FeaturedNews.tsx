// components/home/FeaturedNews.tsx
// This file now only exports the ProcessedStory type.
// Data fetching moved to app/page.tsx (parallel with LatestBlogs).
// The carousel component (FeaturedStoriesCarousel) receives stories as props.

export interface ProcessedStory {
  id:          string;
  title:       string;
  description: string;
  date:        string;
  image:       string;
  slug:        string;
}

// FeaturedStoriesCarousel is the actual render component.
// Import it directly: import { FeaturedStoriesCarousel } from "./FeaturedStoriesCarousel"