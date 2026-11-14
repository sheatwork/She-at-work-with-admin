"use client";
// components/home/FeaturedStoriesCarousel.tsx
// Receives pre-fetched stories from the server component (FeaturedNews.tsx).
// "use client" is needed only for useState (carousel index).
// No fetch, no loading state, no useEffect for data — all gone.

import { motion, Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProcessedStory } from "./FeaturedNews";

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariant = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FeaturedStoriesCarousel({ stories }: { stories: ProcessedStory[] }) {
  const [index, setIndex] = useState(0);

  const total = stories.length;
  const large = stories[index];
  const small = stories[(index + 1) % total];

  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);

  return (
    <section className="py-16 bg-background">
      <motion.div
        className="mx-auto px-5 sm:px-20"
        variants={containerVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Stories</h2>
          <Link href="/entrechat" className="text-sm text-primary font-medium hover:underline">
            View All Stories →
          </Link>
        </motion.div>

        {/* Mobile */}
        <motion.div variants={fadeUp} className="lg:hidden">
          <div className="bg-card rounded-3xl border border-border overflow-hidden">
            <div className="relative h-56">
              <Image src={large.image} alt={large.title} fill className="object-cover" />
              <button onClick={prev} className="absolute left-3 bottom-3 bg-white rounded-full shadow p-2">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next} className="absolute right-3 bottom-3 bg-white rounded-full shadow p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-1">{large.date}</p>
              <h3 className="font-bold text-lg mb-2">{large.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{large.description}</p>
              <Link prefetch={false} href={`/entrechat/${large.slug}`} className="text-sm text-primary font-medium hover:underline">
                Read More →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Desktop */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          {/* Large Card */}
          <motion.div
            variants={slideLeft}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="col-span-2 bg-card rounded-3xl border border-border overflow-hidden"
          >
            <Link prefetch={false} href={`/entrechat/${large.slug}`} className="block group">
              <div className="relative h-72 overflow-hidden">
                <Image
                  src={large.image} alt={large.title} fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="text-xs text-muted-foreground mb-2">{large.date}</p>
                <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{large.title}</h3>
                <p className="text-muted-foreground mb-4">{large.description}</p>
                <span className="text-sm text-primary font-medium">Read More →</span>
              </div>
            </Link>
          </motion.div>

          {/* Small Card */}
          <motion.div
            variants={slideRight}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="bg-card rounded-3xl border border-border overflow-hidden"
          >
            <Link prefetch={false} href={`/entrechat/${small.slug}`} className="block group">
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={small.image} alt={small.title} fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="text-xs text-muted-foreground mb-2">{small.date}</p>
                <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{small.title}</h4>
                <p className="text-muted-foreground mb-4">{small.description}</p>
                <span className="text-sm text-primary font-medium">Read More →</span>
              </div>
            </Link>

            <div className="flex items-center gap-2 px-6 pb-5">
              <button onClick={prev}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={next}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground ml-2">{index + 1} / {total}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}