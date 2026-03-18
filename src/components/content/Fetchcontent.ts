// components/content/fetchContent.ts
// Server-only fetch helper for content listing pages.
//
// WHY RELATIVE URLs BREAK ON VERCEL:
// Relative URLs like `/api/content` work fine in the browser because the
// browser knows the current origin. But on the server (during ISR render),
// there is no "current origin" — the Node.js process doesn't know what
// domain it's running on. So `/api/content` throws "Invalid URL" or fetches nothing.
//
// CORRECT SOLUTION — resolve base URL in this priority order:
//   1. NEXT_PUBLIC_BASE_URL (your custom env var — set this in Vercel)
//   2. VERCEL_URL (auto-set by Vercel on every deployment)
//   3. localhost:3000 (local dev fallback)
//
// VERCEL_URL is always available on Vercel without any configuration.
// It looks like: your-project-abc123.vercel.app
// It does NOT include https:// so we prepend it.
// It is NOT available in the browser (no NEXT_PUBLIC_ prefix) — server only.

import type { BaseApiResponse, ContentType, EntreChatApiResponse } from "./types";

function getBaseUrl(): string {
  // Priority 1: your explicit env var (set this in Vercel dashboard)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Priority 2: Vercel auto-injects this on every deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Priority 3: local dev
  return "http://localhost:3000";
}

export async function fetchInitialContent(
  contentType: ContentType,
  limit = 12,
): Promise<BaseApiResponse | EntreChatApiResponse | null> {
  try {
    const base = getBaseUrl();
    const res = await fetch(
      `${base}/api/content?contentType=${contentType}&page=1&limit=${limit}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    return data;
  } catch {
    return null;
  }
}