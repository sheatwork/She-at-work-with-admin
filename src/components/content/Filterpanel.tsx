"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Building, Calendar, CalendarDays, Clock, FileText,
  Globe, MapPin, Tag, TrendingUp, Video, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MultiSelectDropdown } from "@/components/common/MultiSelectDropdown";
import { Chip } from "@/components/content/Chip";
import type { Category, ContentPageConfig } from "./types";

const predefinedDateRanges = [
  { label: "Last 24h",   value: "24h" },
  { label: "This Week",  value: "week" },
  { label: "This Month", value: "month" },
  { label: "3 Months",   value: "3months" },
  { label: "Custom",     value: "custom" },
];

export type FilterState = {
  selectedCategorySlugs:  string[];
  tagInput:               string;
  selectedReadingTimes:   string[];
  dateRange:              { from: string; to: string };
  selectedDateRange:      string;
  showCustomDatePicker:   boolean;
  searchQuery:            string;
  // EntreChat extras
  selectedIndustrySector:  string;
  selectedBusinessStage:   string;
  selectedInterviewFormat: string;
  selectedFounderRegion:   string;
  selectedSuccessFactor:   string;
  selectedCountry:         string;
  selectedState:           string;
};

type Props = {
  isOpen:              boolean;
  onClose:             () => void;
  state:               FilterState;
  categories:          Category[];
  readingTimeBuckets:  string[];
  config:              ContentPageConfig;
  onClearAll:          () => void;
  // Setters
  setCategorySlugs:    (v: string[]) => void;
  setTagInput:         (v: string) => void;
  setReadingTimes:     (v: string[]) => void;
  setDateRange:        (v: { from: string; to: string }) => void;
  setSelectedDateRange:(v: string) => void;
  setShowCustomDate:   (v: boolean) => void;
  onDateRangePreset:   (v: string) => void;
  // EntreChat-only setters (optional)
  industrySectors?:    string[];
  businessStages?:     string[];
  interviewFormats?:   string[];
  founderRegions?:     string[];
  successFactors?:     string[];
  countries?:          string[];
  states?:             string[];
  onSetIndustrySector?:  (v: string) => void;
  onSetBusinessStage?:   (v: string) => void;
  onSetInterviewFormat?: (v: string) => void;
  onSetFounderRegion?:   (v: string) => void;
  onSetSuccessFactor?:   (v: string) => void;
  onSetCountry?:         (v: string) => void;
  onSetState?:           (v: string) => void;
  // Location detect (EntreChat)
  userLocation?:       { country?: string; state?: string; detected: boolean };
  onDetectLocation?:   () => void;
};

export function FilterPanel({
  isOpen, onClose, state, categories, readingTimeBuckets, config, onClearAll,
  setCategorySlugs, setTagInput, setReadingTimes, setDateRange,
  setSelectedDateRange, setShowCustomDate, onDateRangePreset,
  industrySectors, businessStages, interviewFormats, founderRegions,
  successFactors, countries, states,
  onSetIndustrySector, onSetBusinessStage, onSetInterviewFormat,
  onSetFounderRegion, onSetSuccessFactor, onSetCountry, onSetState,
  userLocation, onDetectLocation,
}: Props) {

  const isEntreChat = config.contentType === "ENTRECHAT";

  const isAnyFilterActive =
    state.selectedCategorySlugs.length > 0 ||
    !!state.tagInput ||
    state.selectedReadingTimes.length > 0 ||
    !!state.dateRange.from || !!state.dateRange.to ||
    !!state.searchQuery ||
    (isEntreChat && (!!state.selectedIndustrySector || !!state.selectedBusinessStage ||
      !!state.selectedInterviewFormat || !!state.selectedFounderRegion ||
      !!state.selectedSuccessFactor || !!state.selectedCountry || !!state.selectedState));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="filter-panel"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="
            absolute top-[calc(100%+8px)]
            left-0 sm:left-auto sm:right-0
            w-[calc(100vw-2rem)] sm:w-96
            bg-white border border-border
            rounded-2xl shadow-2xl z-[9999]
            max-h-[75vh] overflow-y-auto p-4
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">{config.filterTitle}</h4>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Category */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Category</h5>
            <MultiSelectDropdown
              label="Categories"
              icon={<CalendarDays className="h-4 w-4" />}
              options={categories.map((c) => c.name)}
              selectedValues={
                state.selectedCategorySlugs
                  .map((slug) => categories.find((c) => c.slug === slug)?.name)
                  .filter(Boolean) as string[]
              }
              onChange={(vals) => {
                setCategorySlugs(
                  vals.map((name) => categories.find((c) => c.name === name)?.slug).filter(Boolean) as string[]
                );
              }}
              placeholder="Select categories"
              allOptionLabel="All Categories"
            />
          </div>

          {/* Tag */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Filter by Tag
            </h5>
            <Input
              placeholder="Enter tag slug…"
              value={state.tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full"
            />
          </div>

          {/* EntreChat-only filters */}
          {isEntreChat && (
            <>
              <FilterChipGroup label="Industry / Sector" icon={<Building className="h-3 w-3 inline mr-1" />}
                options={industrySectors ?? []} selected={state.selectedIndustrySector}
                onSelect={(v) => onSetIndustrySector?.(state.selectedIndustrySector === v ? "" : v)} />

              <FilterChipGroup label="Business Stage" icon={<TrendingUp className="h-3 w-3 inline mr-1" />}
                options={businessStages ?? []} selected={state.selectedBusinessStage}
                onSelect={(v) => onSetBusinessStage?.(state.selectedBusinessStage === v ? "" : v)} />

              <FilterChipGroup label="Interview Format" icon={<Video className="h-3 w-3 inline mr-1" />}
                options={interviewFormats ?? []} selected={state.selectedInterviewFormat}
                onSelect={(v) => onSetInterviewFormat?.(state.selectedInterviewFormat === v ? "" : v)} />

              <FilterChipGroup label="Founder Region" icon={<Globe className="h-3 w-3 inline mr-1" />}
                options={founderRegions ?? []} selected={state.selectedFounderRegion}
                onSelect={(v) => onSetFounderRegion?.(state.selectedFounderRegion === v ? "" : v)} />

              <FilterChipGroup label="Success Factor" icon={<FileText className="h-3 w-3 inline mr-1" />}
                options={successFactors ?? []} selected={state.selectedSuccessFactor}
                onSelect={(v) => onSetSuccessFactor?.(state.selectedSuccessFactor === v ? "" : v)} />
            </>
          )}

          {/* Reading Time */}
          {readingTimeBuckets.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Reading Time</h5>
              <div className="flex flex-wrap gap-2">
                {readingTimeBuckets.map((bucket) => (
                  <button key={bucket}
                    onClick={() => setReadingTimes(
                      state.selectedReadingTimes.includes(bucket)
                        ? state.selectedReadingTimes.filter((b) => b !== bucket)
                        : [...state.selectedReadingTimes, bucket]
                    )}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                      state.selectedReadingTimes.includes(bucket)
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary/50 border-border hover:bg-secondary"
                    }`}>
                    <Clock className="h-3 w-3 inline mr-1" />{bucket}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Date Range
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {predefinedDateRanges.map((r) => (
                <button key={r.value} onClick={() => onDateRangePreset(r.value)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all duration-200 ${
                    state.selectedDateRange === r.value
                      ? "bg-primary text-white border-primary scale-105"
                      : "bg-secondary/50 border-border hover:bg-secondary"
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            {state.showCustomDatePicker && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="grid grid-cols-2 gap-3 mt-3 p-3 bg-secondary/30 rounded-lg overflow-hidden">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">From</label>
                  <Input type="date" value={state.dateRange.from} className="w-full"
                    onChange={(e) => setDateRange({ ...state.dateRange, from: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">To</label>
                  <Input type="date" value={state.dateRange.to} className="w-full"
                    onChange={(e) => setDateRange({ ...state.dateRange, to: e.target.value })} />
                </div>
              </motion.div>
            )}
            {(state.dateRange.from || state.dateRange.to) && (
              <button onClick={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); setShowCustomDate(false); }}
                className="text-xs text-primary hover:text-primary/80 mt-2 transition-colors">
                Clear date range
              </button>
            )}
          </div>

          {/* EntreChat: Country / State / Location detect */}
          {isEntreChat && (
            <>
              <FilterChipGroup label="Country" icon={<Globe className="h-3 w-3 inline mr-1" />}
                options={countries ?? []} selected={state.selectedCountry}
                onSelect={(v) => onSetCountry?.(state.selectedCountry === v ? "" : v)} />

              <FilterChipGroup label="State / Region" icon={<MapPin className="h-3 w-3 inline mr-1" />}
                options={states ?? []} selected={state.selectedState}
                onSelect={(v) => onSetState?.(state.selectedState === v ? "" : v)} />

              {onDetectLocation && (
                <div className="p-3 bg-secondary/30 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Your Location
                    </h5>
                    <button onClick={onDetectLocation} className="text-xs text-primary hover:text-primary/80 transition-colors">Detect</button>
                  </div>
                  {userLocation?.detected ? (
                    <p className="text-xs text-muted-foreground">
                      Showing interviews from{" "}
                      <span className="font-medium text-foreground">
                        {userLocation.country}{userLocation.state && ` • ${userLocation.state}`}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Click detect to filter by your location</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Active filter chips */}
          {isAnyFilterActive && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 mt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-foreground">Active Filters</h5>
                <button onClick={onClearAll} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <X className="h-3 w-3" /> Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.selectedCategorySlugs.map((slug) => {
                  const cat = categories.find((c) => c.slug === slug);
                  return cat ? (
                    <Chip key={slug} color="primary" icon={<CalendarDays className="h-3 w-3" />}
                      onRemove={() => setCategorySlugs(state.selectedCategorySlugs.filter((s) => s !== slug))}>
                      {cat.name}
                    </Chip>
                  ) : null;
                })}
                {state.tagInput && (
                  <Chip color="purple" icon={<Tag className="h-3 w-3" />} onRemove={() => setTagInput("")}>#{state.tagInput}</Chip>
                )}
                {state.selectedReadingTimes.map((b) => (
                  <Chip key={b} color="blue" icon={<Clock className="h-3 w-3" />}
                    onRemove={() => setReadingTimes(state.selectedReadingTimes.filter((x) => x !== b))}>{b}</Chip>
                ))}
                {state.selectedDateRange && state.selectedDateRange !== "custom" && (
                  <Chip color="green" icon={<Calendar className="h-3 w-3" />}
                    onRemove={() => { setDateRange({ from: "", to: "" }); setSelectedDateRange(""); }}>
                    {predefinedDateRanges.find((r) => r.value === state.selectedDateRange)?.label}
                  </Chip>
                )}
                {state.searchQuery && (
                  <Chip color="amber" icon={<X className="h-3 w-3" />} onRemove={onClearAll}>
                    Search: {state.searchQuery}
                  </Chip>
                )}
                {/* EntreChat chips */}
                {isEntreChat && state.selectedIndustrySector && (
                  <Chip color="blue" icon={<Building className="h-3 w-3" />}
                    onRemove={() => onSetIndustrySector?.("")}>{state.selectedIndustrySector}</Chip>
                )}
                {isEntreChat && state.selectedBusinessStage && (
                  <Chip color="green" icon={<TrendingUp className="h-3 w-3" />}
                    onRemove={() => onSetBusinessStage?.("")}>{state.selectedBusinessStage}</Chip>
                )}
                {isEntreChat && state.selectedInterviewFormat && (
                  <Chip color="purple" icon={<Video className="h-3 w-3" />}
                    onRemove={() => onSetInterviewFormat?.("")}>{state.selectedInterviewFormat}</Chip>
                )}
                {isEntreChat && state.selectedFounderRegion && (
                  <Chip color="purple" icon={<Globe className="h-3 w-3" />}
                    onRemove={() => onSetFounderRegion?.("")}>{state.selectedFounderRegion}</Chip>
                )}
                {isEntreChat && state.selectedSuccessFactor && (
                  <Chip color="amber" icon={<FileText className="h-3 w-3" />}
                    onRemove={() => onSetSuccessFactor?.("")}>{state.selectedSuccessFactor}</Chip>
                )}
                {isEntreChat && state.selectedCountry && (
                  <Chip color="purple" icon={<Globe className="h-3 w-3" />}
                    onRemove={() => onSetCountry?.("")}>{state.selectedCountry}</Chip>
                )}
                {isEntreChat && state.selectedState && (
                  <Chip color="amber" icon={<MapPin className="h-3 w-3" />}
                    onRemove={() => onSetState?.("")}>{state.selectedState}</Chip>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Internal helper ────────────────────────────────────────────────────────────

function FilterChipGroup({
  label, icon, options, selected, onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div className="mb-4">
      <h5 className="text-sm font-medium text-foreground mb-2">{label}</h5>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt} onClick={() => onSelect(opt)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
              selected === opt ? "bg-primary text-white border-primary" : "bg-secondary/50 border-border hover:bg-secondary"
            }`}>
            {icon}{opt}
          </button>
        ))}
      </div>
    </div>
  );
}