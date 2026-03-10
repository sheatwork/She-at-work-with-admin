// app/api/admin/content/route.ts
// SUPER_ADMIN + ADMIN: list and create content
/*eslint-disable  @typescript-eslint/no-explicit-any*/
import { db } from "@/db";
import { CategoriesTable, ContentTable, ContentTagsTable, TagsTable, UsersTable } from "@/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    + "-" + Date.now(); // ✅ appended timestamp avoids slug collision without extra DB read
}

// ─── GET /api/admin/content ───────────────────────────────────────────────────
// Query: ?contentType=BLOG&status=PUBLISHED&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType") as typeof ContentTable.$inferSelect["contentType"] | null;
    const status = searchParams.get("status") as typeof ContentTable.$inferSelect["status"] | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20")); // ✅ cap at 100
    const offset = (page - 1) * limit;

    // ── Build WHERE conditions ─────────────────────────────────────────────────
    const conditions = [];
    if (contentType) conditions.push(eq(ContentTable.contentType, contentType));
    if (status) conditions.push(eq(ContentTable.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // ✅ Run count + data in parallel — halves round-trips vs sequential queries
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: ContentTable.id,
          title: ContentTable.title,
          slug: ContentTable.slug,
          summary: ContentTable.summary,
          contentType: ContentTable.contentType,
          status: ContentTable.status,
          featuredImage: ContentTable.featuredImage,
          readingTime: ContentTable.readingTime,
          publishedAt: ContentTable.publishedAt,
          createdAt: ContentTable.createdAt,
          authorName: ContentTable.authorName,
          categoryName: CategoriesTable.name,
          creatorName: UsersTable.name,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .leftJoin(UsersTable, eq(ContentTable.createdBy, UsersTable.id))
        .where(whereClause)
        .orderBy(desc(ContentTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(ContentTable)
        .where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/content]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch content" }, { status: 500 });
  }
}

// ─── POST /api/admin/content ──────────────────────────────────────────────────
// Body: { title, content, contentType, summary?, categoryId?, authorName?,
//         featuredImage?, externalUrl?, status?, publishedAt?, readingTime? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, content, contentType, summary, categoryId,
      authorName, featuredImage, externalUrl, status,
      publishedAt, readingTime, createdBy, tags = [], // Add tags
    } = body;

    if (!title || !content || !contentType) {
      return NextResponse.json(
        { success: false, error: "title, content and contentType are required" },
        { status: 400 }
      );
    }

    const slug = toSlug(title);

    // Use transaction to ensure both content and tags are created
    const result = await db.transaction(async (tx) => {
      // Insert content
      const [newContent] = await tx
        .insert(ContentTable)
        .values({
          title: title.trim(),
          slug,
          content,
          contentType,
          summary: summary?.trim() ?? null,
          categoryId: categoryId ?? null,
          createdBy: createdBy ?? null,
          authorName: authorName?.trim() ?? null,
          featuredImage: featuredImage ?? null,
          externalUrl: externalUrl ?? null,
          readingTime: readingTime ?? null,
          status: status ?? "DRAFT",
          publishedAt: publishedAt ? new Date(publishedAt) : null,
        })
        .returning();

      // Insert tags if any
      if (tags.length > 0) {
        await tx.insert(ContentTagsTable).values(
          tags.map((tagId: string) => ({
            contentId: newContent.id,
            tagId: tagId,
          }))
        );

        // Increment usage count for each tag
        for (const tagId of tags) {
          await tx
            .update(TagsTable)
            .set({ usageCount: sql`${TagsTable.usageCount} + 1` })
            .where(eq(TagsTable.id, tagId));
        }
      }

      return newContent;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Content with this slug already exists" },
        { status: 409 }
      );
    }
    console.error("[POST /admin/content]", err);
    return NextResponse.json({ success: false, error: "Failed to create content" }, { status: 500 });
  }
}