// components/content/fetchContent.ts
// Server-only fetch helper for content listing pages.
// Updated to handle the new hasMore-based pagination from the optimized API.

import type { BaseApiResponse, ContentType, EntreChatApiResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export async function fetchInitialContent(
  contentType: ContentType,
  limit = 12,
): Promise<BaseApiResponse | EntreChatApiResponse | null> {
  try {
    const res = await fetch(
      `${BASE}/api/content?contentType=${contentType}&page=1&limit=${limit}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}