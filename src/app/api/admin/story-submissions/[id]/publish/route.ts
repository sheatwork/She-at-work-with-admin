// app/api/admin/story-submissions/[id]/publish/route.ts
// ADMIN: Publish a story submission → creates a ContentTable row + marks submission PUBLISHED
//
// Body: {
//   reviewedBy:   string (admin user id)
//   reviewNotes?: string
//   // Content fields (admin fills these in the publish dialog):
//   title?:        string  (defaults to submission title)
//   authorName?:   string  (defaults to submitter name)
//   summary?:      string
//   categoryId?:   string
//   featuredImage?:string
//   readingTime?:  number
//   contentType?:  "SUCCESS_STORY" | other  (defaults to SUCCESS_STORY)
// }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { StorySubmissionsTable, ContentTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };

function toSlug(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    + "-" + Date.now();
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
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }
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
      title        = submission.title,
      authorName   = submission.name,
      summary,
      categoryId,
      featuredImage,
      readingTime,
      contentType  = "SUCCESS_STORY",
    } = body;

    if (!reviewedBy) {
      return NextResponse.json(
        { success: false, error: "reviewedBy is required" },
        { status: 400 }
      );
    }

    // ── 2. Create content row ─────────────────────────────────────────────────
    const [newContent] = await db
      .insert(ContentTable)
      .values({
        title:        title.trim(),
        slug:         toSlug(title),
        content:      submission.story,          // story body becomes content
        contentType,
        status:       "PUBLISHED",
        publishedAt:  new Date(),
        authorName:   authorName?.trim() ?? null,
        summary:      summary?.trim()   ?? null,
        categoryId:   categoryId        ?? null,
        featuredImage:featuredImage     ?? null,
        readingTime:  readingTime       ?? null,
        createdBy:    reviewedBy,
      })
      .returning();

    // ── 3. Mark submission as PUBLISHED + link content ────────────────────────
    const [updatedSubmission] = await db
      .update(StorySubmissionsTable)
      .set({
        status:             "PUBLISHED",
        reviewedBy,
        reviewNotes:        reviewNotes ?? null,
        reviewedAt:         new Date(),
        publishedContentId: newContent.id,
      })
      .where(eq(StorySubmissionsTable.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        submission: updatedSubmission,
        content:    newContent,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /admin/story-submissions/:id/publish]", err);
    return NextResponse.json({ success: false, error: "Failed to publish submission" }, { status: 500 });
  }
}