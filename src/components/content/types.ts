// ─── Shared content types ─────────────────────────────────────────────────────

export type ContentType = "NEWS" | "BLOG" | "ENTRECHAT" | "EVENT" | "PRESS" | "SUCCESS_STORY" | "RESOURCE";

export type Category = { id: string; name: string; slug: string };
export type ApiTag   = { id: string; name: string; slug: string };

export type BaseContentItem = {
  id:            string;
  title:         string;
  slug:          string;
  summary:       string | null;
  featuredImage: string | null;
  externalUrl:   string | null;
  readingTime:   number | null;
  publishedAt:   string | null;
  authorName:    string | null;
  categoryId:    string | null;
  categoryName:  string | null;
  categorySlug:  string | null;
  tags:          ApiTag[];
};

export type NewsItem = BaseContentItem;

export type BlogItem = BaseContentItem & {
  contentType: string;
};

export type EntreChatItem = BaseContentItem & {
  excerpt:         string | null;
  interviewee:     string | null;
  industrySector:  string | null;
  businessStage:   string | null;
  interviewFormat: string | null;
  founderRegion:   string | null;
  successFactor:   string | null;
  country:         string | null;
  state:           string | null;
};

export type SuggestionCandidate = {
  id:           string;
  title:        string;
  slug:         string;
  publishedAt:  string | null;
  authorName:   string | null;
  categoryName: string | null;
};

export type SearchSuggestion = {
  id:        string;
  title:     string;
  slug:      string;
  category:  string;
  date:      string;
  relevance: number;
};

export type BaseApiResponse = {
  items:               BaseContentItem[];
  totalItems:          number;
  totalPages:          number;
  page:                number;
  limit:               number;
  categories:          Category[];
  readingTimes:        string[];
  suggestionCandidates?: SuggestionCandidate[];
};

export type EntreChatApiResponse = BaseApiResponse & {
  items:            EntreChatItem[];
  industrySectors:  string[];
  businessStages:   string[];
  interviewFormats: string[];
  founderRegions:   string[];
  successFactors:   string[];
  countries:        string[];
  states:           string[];
};

export type ContentPageConfig = {
  contentType:       ContentType;
  /** Route prefix — e.g. "news", "blogs", "entrechat" */
  slug:              string;
  /** Banner images */
  bannerDesktop:     string;
  bannerMobile:      string;
  bannerAlt:         string;
  /** Text */
  bannerTitle:       string;
  bannerSubtitle:    string;
  featuredLabel:     string;
  sidebarTitle:      string;
  gridTitle:         string;
  searchPlaceholder: string;
  filterTitle:       string;
  emptyMessage:      string;
  /** Link label on featured card CTA */
  featuredCta:       string;
  /** "View All X" label in sidebar */
  viewAllLabel:      string;
  /** Section id for "View All" scroll target */
  gridSectionId:     string;
};