/*eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar/Navbar"
import { Suspense } from "react"
import { getPlaylistVideos, getChannelPlaylists } from "@/lib/youtube"
import { PlaylistDetailClient } from "@/components/playlist/PlaylistDetailClient"
import { notFound } from "next/navigation"

export const revalidate = 3600

// Without generateStaticParams, Next 15 renders a dynamic segment on every
// request and ignores `revalidate`. [] prebuilds nothing but makes each
// playlist on-demand ISR: rendered once, then served from cache.
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>   // ← Promise type
}): Promise<Metadata> {
  const { id } = await params        // ← await it
  const playlists = await getChannelPlaylists()
  const playlist = playlists.find((p: any) => p.id === id)
  // Only this channel's playlists. Any other id used to render (and, once
  // cached, store) a page and spend YouTube API quota.
  if (!playlist) notFound()
  const title = playlist?.snippet?.title ?? "Playlist"
  return {
    title: `${title} | She At Work`,
    description: playlist?.snippet?.description ?? "Watch this playlist on She At Work.",
  }
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>   // ← Promise type
}) {
  const { id } = await params        // ← await it

  // Playlists first (served from the fetch cache; generateMetadata just
  // fetched them) so an unknown id never reaches the playlistItems API.
  const playlists = await getChannelPlaylists()
  const currentPlaylist = playlists.find((p: any) => p.id === id)
  if (!currentPlaylist) notFound()

  const videos = await getPlaylistVideos(id)
  const playlistTitle = currentPlaylist?.snippet?.title ?? "Playlist"
  const playlistDescription = currentPlaylist?.snippet?.description ?? ""

  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <PlaylistDetailClient
          videos={videos}
          playlistId={id}
          playlistTitle={playlistTitle}
          playlistDescription={playlistDescription}
        />
      </Suspense>
    </>
  )
}