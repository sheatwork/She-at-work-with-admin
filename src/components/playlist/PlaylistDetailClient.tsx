/*eslint-disable  @typescript-eslint/no-unused-vars */
/*eslint-disable  @typescript-eslint/no-explicit-any */
"use client"

import Cta from "@/components/common/Cta"
import { ScrollFade } from "@/components/common/ScrollFade"
import { motion, Variants } from "framer-motion"
import { ChevronLeft, ListVideo, Play } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"



const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const bannerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
}

const bannerSubtitleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

interface Props {
  videos: any[]
  playlistId: string
  playlistTitle: string
  playlistDescription: string
}

export function PlaylistDetailClient({
  videos,
  playlistId,
  playlistTitle,
  playlistDescription,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeVideo = videos[activeIndex]
  const activeVideoId = activeVideo?.snippet?.resourceId?.videoId

  if (!videos.length) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center pt-24">
        <p className="text-muted-foreground text-lg">No videos found in this playlist.</p>
      </main>
    )
  }

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
      
            
            </section>
      {/* ── HERO BANNER — same pattern as CoreTeam ───────────────────────── */}
      {/* <section className="relative px-4 sm:px-6 lg:px-8 pt-28 pb-10 overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        <div className="relative max-w-screen-xl mx-auto text-white px-4">
   
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5"
          >
            <Link
              href="/playlists"
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              All Playlists
            </Link>
          </motion.div>

          <motion.div variants={bannerVariants} initial="hidden" animate="visible">
            <p className="text-white/70 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3">
              She At Work · Playlist
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 max-w-3xl leading-tight">
              {playlistTitle}
            </h1>
          </motion.div>

          {playlistDescription && (
            <motion.p
              variants={bannerSubtitleVariants}
              initial="hidden"
              animate="visible"
              className="text-sm sm:text-base text-white/80 max-w-2xl line-clamp-2"
            >
              {playlistDescription}
            </motion.p>
          )}
        </div>
      </section> */}

      {/* ── PLAYER + VIDEO LIST ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 bg-secondary/10">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">

            {/* LEFT — Player + active video info */}
            <motion.div
              variants={fadeInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex-1 min-w-0"
            >
              {/* Player */}
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-border">
                <iframe
                  key={activeVideoId}
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&list=${playlistId}&rel=0`}
                  title={activeVideo?.snippet?.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              {/* Active video info */}
              <div className="mt-5 bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary fill-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1">
                      Now Playing · {activeIndex + 1} of {videos.length}
                    </p>
                    <h2 className="text-base sm:text-lg font-display font-bold text-foreground line-clamp-2 leading-snug">
                      {activeVideo?.snippet?.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {new Date(activeVideo?.snippet?.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {activeVideo?.snippet?.description && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                        {activeVideo.snippet.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT — Video list */}
            <motion.div
              variants={fadeInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:w-80 xl:w-96 flex-shrink-0"
            >
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* List header */}
                <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
                  <ListVideo className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Playlist · {videos.length} Videos
                  </span>
                </div>

                {/* Scrollable list */}
                <div className="flex flex-col max-h-[520px] lg:max-h-[600px] overflow-y-auto">
                  {videos.map((video: any, index: number) => {
                    const { title, thumbnails, resourceId } = video.snippet
                    const thumbnail = thumbnails?.medium?.url ?? thumbnails?.default?.url
                    const isActive = index === activeIndex

                    return (
                      <button
                        key={resourceId.videoId}
                        onClick={() => setActiveIndex(index)}
                        className={`flex gap-3 p-3 text-left transition-all duration-200 border-b border-border/50 last:border-0 ${
                          isActive
                            ? "bg-primary/8 border-l-2 border-l-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={thumbnail}
                            unoptimized
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                          {isActive ? (
                            <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                                <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <p className={`text-xs font-medium line-clamp-3 leading-relaxed ${
                          isActive ? "text-primary" : "text-foreground"
                        }`}>
                          {title}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA — same as every other page ──────────────────────────────── */}
      <ScrollFade delay={0.2} once={false}>
        <Cta />
      </ScrollFade>
    </main>
  )
}