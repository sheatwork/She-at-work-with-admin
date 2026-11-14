// lib/youtube.ts
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_ID = "UCRDm04xdA1tWZsBoMCyEUqw"

/**
 * GET a YouTube Data API list endpoint and return its `items`.
 *
 * Errors used to be swallowed: a quota or key error has no `items`, so
 * `data.items ?? []` cached an empty She Diaries page for the next hour.
 * Now a failure at runtime throws, so ISR keeps serving the last good page.
 * At build time it returns [] instead, so a YouTube outage cannot fail a
 * deploy; the page refills on its next hourly regeneration.
 */
async function youtubeList(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    const message = `YouTube API ${res.status} for ${url.split("?")[0]}`
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      console.warn(`${message} (build: continuing with an empty list)`)
      return []
    }
    throw new Error(message)
  }
  const data = await res.json()
  return data.items ?? []
}

export async function getChannelPlaylists() {
  return youtubeList(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${CHANNEL_ID}&maxResults=50&key=${API_KEY}`
  )
}

export async function getPlaylistVideos(playlistId: string) {
  return youtubeList(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${API_KEY}`
  )
}
