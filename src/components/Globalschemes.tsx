// components/GlobalschemeComponent.tsx
"use client";

import { motion, Variants } from "framer-motion";
import { ChevronDown, ExternalLink, Globe } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import Cta from "./common/Cta";
import { MultiSelectDropdown } from "./common/MultiSelectDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scheme {
  id: string;
  title: string;
  description: string;
  link: string;
}

interface LocationOption {
  locationKey: string;
  locationLabel: string;
}

interface ResourcesGrouped {
  grouped: Record<string, { label: string; schemes: Scheme[] }>;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const bannerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};
const bannerSubtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SchemeSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-2/3 mb-3" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalschemeComponent() {
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [grouped, setGrouped] = useState<Record<string, { label: string; schemes: Scheme[] }>>({});
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);

  // ── Step 1: Fetch country options ─────────────────────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/resources?scope=GLOBAL&meta=1`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: { locations: LocationOption[] } = await res.json();
        setLocationOptions(data.locations);

        // Default to first country
        const firstKey = data.locations[0]?.locationKey ?? "";
        if (firstKey) setSelectedKeys([firstKey]);
      } catch (err) {
        console.error("Failed to fetch country options:", err);
      } finally {
        setIsLoadingMeta(false);
      }
    };
    fetchMeta();
  }, []);

  // ── Step 2: Fetch schemes when selection changes ──────────────────────────
  useEffect(() => {
    if (selectedKeys.length === 0) {
      setGrouped({});
      return;
    }

    const fetchSchemes = async () => {
      setIsLoadingSchemes(true);
      try {
        const keys = selectedKeys.join(",");
        const res = await fetch(
          `/api/resources?scope=GLOBAL&locationKeys=${encodeURIComponent(keys)}`
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: ResourcesGrouped = await res.json();
        setGrouped(data.grouped);
      } catch (err) {
        console.error("Failed to fetch global schemes:", err);
        setGrouped({});
      } finally {
        setIsLoadingSchemes(false);
      }
    };

    fetchSchemes();
  }, [selectedKeys]);

  // ── Flatten grouped → flat list ───────────────────────────────────────────
  const currentSchemes: Scheme[] = Object.values(grouped).flatMap((g) => g.schemes);

  // ── Dropdown helpers ──────────────────────────────────────────────────────
  const allDisplayOptions = locationOptions.map((l) => l.locationLabel);
  const selectedDisplayValues = locationOptions
    .filter((l) => selectedKeys.includes(l.locationKey))
    .map((l) => l.locationLabel);

  const handleDropdownChange = (displayValues: string[]) => {
    const keys = displayValues
      .map((dv) => locationOptions.find((l) => l.locationLabel === dv)?.locationKey)
      .filter(Boolean) as string[];
    setSelectedKeys(keys);
    setExpandedScheme(null);
  };

  const toggleScheme = (id: string) =>
    setExpandedScheme(expandedScheme === id ? null : id);

  const getTruncatedDescription = (description: string) => {
    const maxLength = 100;
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength).trim() + "...";
  };

  return (
    <main className="bg-background min-h-screen flex flex-col">
      {/* Banner */}
      <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
        <div className="absolute inset-0" style={{ top: 96 }}>
          <div className="block lg:hidden relative w-full h-full">
            <Image
              src="/gettingstarted/Mobile Getting Started.png"
              alt="News Banner"
              fill
              className="object-cover object-center"
              priority
              sizes="(max-width: 1024px) 100vw"
            />
          </div>
          <div className="hidden lg:block relative w-full h-full">
            <Image
              src="/gettingstarted/finalGettingstartedbanner.png"
              alt="News Banner"
              fill
              className="object-cover object-center"
              priority
              sizes="(min-width: 1024px) 100vw"
            />
          </div>
        </div>
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
              <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                <h1 className="text-white leading-tight">
                  <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">
                    Global Government Schemes
                  </span>
                </h1>
              </motion.div>
              <motion.p
                initial="hidden"
                animate="visible"
                variants={bannerSubtitleVariants}
                className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl"
              >
                Check out options in the country that can set you up as an independent
                entrepreneur…your journey starts now!
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/10">
        <div className="max-w-screen-xl mx-auto">
          {/* Header + Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
                Women Entrepreneurship Schemes
              </h2>
              <p className="text-muted-foreground max-w-3xl">
                Discover government and institutional support available for women-led businesses
                {selectedDisplayValues.length > 0
                  ? ` in ${selectedDisplayValues.join(", ")}`
                  : ". Explore opportunities worldwide!"}
              </p>
            </div>

            <div className="w-full sm:w-80">
              {isLoadingMeta ? (
                <div className="h-10 bg-muted animate-pulse rounded-lg" />
              ) : (
                <MultiSelectDropdown
                  label="Countries"
                  icon={<Globe className="h-4 w-4" />}
                  options={allDisplayOptions}
                  selectedValues={selectedDisplayValues}
                  onChange={handleDropdownChange}
                  placeholder="Select countries"
                  allOptionLabel="All Countries"
                />
              )}
            </div>
          </div>

          {/* Schemes */}
          {isLoadingSchemes ? (
            <SchemeSkeleton />
          ) : currentSchemes.length > 0 ? (
            <div className="space-y-4">
              {currentSchemes.map((scheme) => {
                const isExpanded = expandedScheme === scheme.id;
                const isHovered = hoveredCard === scheme.id;

                return (
                  <div
                    key={scheme.id}
                    onMouseEnter={() => setHoveredCard(scheme.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className={`bg-card rounded-xl overflow-hidden shadow-md transition-all duration-300 border
                      ${isHovered || isExpanded
                        ? "shadow-2xl border-primary/50 scale-[1.02] -translate-y-1"
                        : "border-border hover:shadow-lg"
                      }`}
                    style={{ transformOrigin: "center" }}
                  >
                    <button
                      onClick={() => toggleScheme(scheme.id)}
                      className={`w-full px-6 py-5 flex items-start justify-between gap-4 text-left
                        transition-all duration-300
                        ${isHovered || isExpanded
                          ? "bg-gradient-to-r from-primary/5 to-primary/10"
                          : "hover:bg-secondary/5"
                        }`}
                    >
                      <div className="flex-1">
                        <h3
                          className={`text-lg sm:text-xl font-display font-bold mb-2
                            transition-all duration-300
                            ${isHovered || isExpanded ? "text-primary scale-[1.02]" : "text-foreground"}`}
                        >
                          {scheme.title}
                        </h3>
                        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                          {isExpanded
                            ? scheme.description
                            : getTruncatedDescription(scheme.description)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                        {scheme.link && scheme.link.trim() !== "" && (
                          <a
                            href={scheme.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-1.5 rounded-lg transition-all duration-300 group/link
                              ${isHovered
                                ? "bg-primary/20 scale-110 rotate-12"
                                : "hover:bg-primary/10 hover:scale-110"
                              }`}
                            title="Learn More"
                          >
                            <ExternalLink
                              className={`h-5 w-5 transition-colors
                                ${isHovered ? "text-primary" : "text-primary group-hover/link:text-primary/80"}`}
                            />
                          </a>
                        )}
                        <ChevronDown
                          className={`h-5 w-5 text-primary transition-all duration-300
                            ${isExpanded ? "rotate-180" : ""}
                            ${isHovered ? "scale-125" : ""}`}
                        />
                      </div>
                    </button>

                    {/* {isExpanded && scheme.link && scheme.link.trim() !== "" && (
                      <div className="px-6 pb-5 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <a
                          href={scheme.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary font-medium
                            hover:text-primary/80 transition-all hover:gap-3 hover:translate-x-1"
                        >
                          Learn More →
                        </a>
                      </div>
                    )} */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <p className="text-lg text-muted-foreground">
                No schemes listed yet for{" "}
                {selectedDisplayValues.length === 0 ? "any country" : "the selected countries"}.
              </p>
              <p className="text-sm mt-2 text-muted-foreground/80">Data will be updated soon.</p>
            </div>
          )}
        </div>
      </section>

      <Cta />
    </main>
  );
}