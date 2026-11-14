/*eslint-disable  @typescript-eslint/no-unused-vars */
/*eslint-disable  @typescript-eslint/no-explicit-any */
"use client"

import { motion, Variants } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import Cta from "@/components/common/Cta"
import { AnimatedText, ScrollFade, StaggerChildren } from "@/components/common/ScrollFade"
import { Play } from "lucide-react"

// ── Animation variants (same as your other pages) ────────────────────────────

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
}

const bannerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
}

const bannerSubtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

export function PlaylistGrid({ playlists }: { playlists: any[] }) {
  return (
    <main className="bg-background min-h-screen">


            <section className="relative h-[480px] md:h-[600px] lg:h-[470px] overflow-hidden pt-24">
             <div className="absolute inset-0" style={{ top: 96 }}>
                  <div className="block lg:hidden relative w-full h-full">
                    <Image
                     
                      src="/shediaries/YTbannermobile.jpg"
                      
                      
                      alt="She Diaries"
                      fill
                      className="object-cover object-center"
                      priority
                      sizes="(max-width: 1024px) 100vw"
                    />
                  </div>
                  <div className="hidden lg:block relative w-full h-full">
                    <Image
                       src="/shediaries/YTbannerforwebsite.jpg"
                      alt="She Diaries"
                      fill
                      className="object-cover object-center"
                      priority
                      sizes="(min-width: 1024px) 100vw"
                    />
                  </div>
                </div>
      
              {/* <div className="relative z-10 h-full flex items-center">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl px-2 sm:px-6 lg:px-8 -mt-40 lg:mt-0">
                    <motion.div initial="hidden" animate="visible" variants={bannerVariants}>
                      <h1 className="text-white leading-tight">
                        <span className="block text-3xl sm:text-4xl lg:text-6xl font-bold">
                          She Diaries
                        </span>
                      </h1>
                    </motion.div>
                    <motion.p
                      initial="hidden" animate="visible" variants={bannerSubtitleVariants}
                      className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl text-white/90 leading-relaxed max-w-xl"
                    >
                      Curated video collections on women entrepreneurship, leadership stories, and resources.
                    </motion.p>
                  </div>
                </div>
              </div> */}
            </section>

      {/* ── PLAYLIST GRID ────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-secondary/10">
        <div className="max-w-screen-xl mx-auto">

          <StaggerChildren once={false}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {playlists.map((playlist: any, i: number) => {
                const { title, thumbnails, description } = playlist.snippet
                const videoCount = playlist.contentDetails?.itemCount ?? 0
                const thumbnail = thumbnails?.high?.url ?? thumbnails?.default?.url

                return (
                  <motion.div
                    key={playlist.id}
                    variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
                  >
                    <Link
                      href={`/sheDiaries/${playlist.id}`}
                      className="group  rounded-2xl overflow-hidden border border-border bg-card shadow-md hover:shadow-2xl transition-all duration-300 h-full flex flex-col"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={thumbnail}
                          unoptimized
                          alt={title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        {/* Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                            <Play className="h-6 w-6 fill-white text-white ml-1" />
                          </div>
                        </div>

                        {/* Video count badge */}
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                          <Play className="h-3 w-3 fill-white" />
                          {videoCount} videos
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        <h3 className="font-display font-semibold text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-2">
                          {title}
                        </h3>
                        {description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                            {description}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                          Watch
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </StaggerChildren>
        </div>
      </section>

      {/* ── CTA — same as every other page ──────────────────────────────── */}
      <ScrollFade delay={0.2} once={false}>
        <Cta />
      </ScrollFade>
    </main>
  )
}