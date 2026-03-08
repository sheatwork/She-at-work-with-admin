// components/blogs/SearchSuggestions.tsx
// ✅ Removed `author` field — not in API response
// ✅ Highlights matched query text inline

import { ArrowRight, Calendar, ChevronRight, Search } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  category: string;
  date: string;
  slug: string;
  relevance: number;
}

interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (title: string) => void;
  searchQuery: string;
  isVisible: boolean;
  onClose: () => void;
}

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-primary font-semibold bg-primary/10 px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export const SearchSuggestions = ({
  suggestions,
  onSelect,
  searchQuery,
  isVisible,
  onClose,
}: SearchSuggestionsProps) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
      <div className="p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Suggestions ({suggestions.length})
          </span>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>

        {suggestions.map((s) => (
          <button key={s.id} onClick={() => onSelect(s.title)}
            className="w-full text-left p-3 hover:bg-secondary/50 rounded-lg transition-colors group">
            <div className="flex items-start gap-3">
              <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold uppercase">
                    {s.category}
                  </span>
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1 group-hover:text-primary transition-colors">
                  {highlight(s.title, searchQuery)}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {s.date}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}

        <div className="border-t border-border mt-2 pt-2">
          <button onClick={() => onSelect(searchQuery)}
            className="w-full text-left p-3 hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">
                    Search all results for &ldquo;{searchQuery}&rdquo;
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestions.length}+ articles found
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};