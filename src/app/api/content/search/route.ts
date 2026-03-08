// app/api/content/search/route.ts
// Dedicated lightweight endpoint for search suggestions.
//
// WHY SEPARATE from /api/content:
// - Main route paginates (limit 12) — so searching only returns page 1 items
// - A user typing "XYZ" might have that article on page 73 — it would never appear
// - This scans ALL ~1900 published rows and returns 50 candidates, ranked client-side
// - Only fetches 5 slim fields (no tags, no summary) — tiny payload
//
// Usage: GET /api/content/search?q=entrepreneur&contentType=BLOG
/*eslint-disable  @typescript-eslint/no-explicit-any*/
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ContentTable, CategoriesTable } from "@/db/schema";
import { and, eq, or, ilike, desc } from "drizzle-orm";

const SEARCH_CACHE = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q           = searchParams.get("q")?.trim() ?? "";
    const contentType = searchParams.get("contentType") ?? "BLOG";

    if (q.length < 2) {
      return NextResponse.json({ results: [] }, { headers: SEARCH_CACHE });
    }

    // ✅ Scans ALL published rows — no OFFSET, no pagination
    // An article on page 73 is found just as easily as one on page 1
    const rows = await db
      .select({
        id:           ContentTable.id,
        title:        ContentTable.title,
        slug:         ContentTable.slug,
        publishedAt:  ContentTable.publishedAt,
        authorName:   ContentTable.authorName,
        categoryName: CategoriesTable.name,
      })
      .from(ContentTable)
      .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
      .where(
        and(
          eq(ContentTable.contentType, contentType as any),
          eq(ContentTable.status, "PUBLISHED"),
          or(
            ilike(ContentTable.title,      `%${q}%`),
            ilike(ContentTable.authorName, `%${q}%`)
          )
        )
      )
      .orderBy(desc(ContentTable.publishedAt))
      .limit(50); // fetch top 50 candidates, rank to top 8 in BlogsPage

    return NextResponse.json({ results: rows }, { headers: SEARCH_CACHE });

  } catch (err) {
    console.error("[GET /api/content/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}