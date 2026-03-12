// app/api/admin/story-submissions/[id]/publish/route.ts
// ADMIN: Publish a story submission
// Creates a ContentTable row + marks submission as PUBLISHED in a single transaction.
//
// Body: {
//   reviewedBy:    string  (admin user id — required)
//   reviewNotes?:  string
//   title?:        string  (defaults to submission title)
//   authorName?:   string  (defaults to submitter name)
//   summary?:      string
//   categoryId?:   string
//   featuredImage?:string
//   readingTime?:  number
//   contentType?:  "SUCCESS_STORY" | other  (defaults to SUCCESS_STORY)
// }
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { ContentTable, StorySubmissionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") +
    "-" +
    Date.now()
  );
}

export async function POST(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    // ── 1. Load submission ────────────────────────────────────────────────────
    const [submission] = await db
      .select()
      .from(StorySubmissionsTable)
      .where(eq(StorySubmissionsTable.id, id))
      .limit(1);

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // FIX: guard against double-publish — return 409 if already published
    if (submission.status === "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: "Submission already published" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const {
      reviewedBy,
      reviewNotes,
      title         = submission.title,
      authorName    = submission.name,
      summary,
      categoryId,
      featuredImage,
      readingTime,
      contentType   = "SUCCESS_STORY",
    } = body;

    if (!reviewedBy) {
      return NextResponse.json(
        { success: false, error: "reviewedBy is required" },
        { status: 400 }
      );
    }

    // FIX: wrap both inserts in a transaction so if either fails, neither is
    // committed — previously a crash after ContentTable insert would leave the
    // submission stuck in PENDING with an orphaned content row.
    const { submission: updatedSubmission, content: newContent } =
      await db.transaction(async (tx) => {

        // ── 2. Create content row ───────────────────────────────────────────
        const [content] = await tx
          .insert(ContentTable)
          .values({
            title:         title.trim(),
            slug:          toSlug(title),
            content:       submission.story,   // story body becomes article content
            contentType,
            status:        "PUBLISHED",
            publishedAt:   new Date(),
            authorName:    authorName?.trim()  ?? null,
            summary:       summary?.trim()     ?? null,
            categoryId:    categoryId          ?? null,
            featuredImage: featuredImage       ?? null,
            readingTime:   readingTime         ?? null,
            createdBy:     reviewedBy,
          })
          .returning();

        // ── 3. Mark submission PUBLISHED + link content ─────────────────────
        const [updated] = await tx
          .update(StorySubmissionsTable)
          .set({
            status:             "PUBLISHED",
            reviewedBy,
            reviewNotes:        reviewNotes ?? null,
            reviewedAt:         new Date(),
            publishedContentId: content.id,
          })
          .where(eq(StorySubmissionsTable.id, id))
          .returning();

        return { submission: updated, content };
      });

    return NextResponse.json(
      { success: true, data: { submission: updatedSubmission, content: newContent } },
      { status: 201 }
    );
  } catch (err: any) {
    // FIX: catch slug collision (23505) and return a clear error instead of 500
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, error: "A content item with this title already exists — try editing the title" },
        { status: 409 }
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /admin/story-submissions/:id/publish]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to publish submission" },
      { status: 500 }
    );
  }
}