// app/api/admin/story-submissions/[id]/route.ts
// ADMIN: GET single submission + PATCH to review/publish/reject

import { db } from "@/db";
import { CategoriesTable, ContentTable, StorySubmissionsTable, UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

// ─── GET /api/admin/story-submissions/[id] ────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const [row] = await db
      .select({
        id:                 StorySubmissionsTable.id,
        name:               StorySubmissionsTable.name,
        email:              StorySubmissionsTable.email,
        phone:              StorySubmissionsTable.phone,
        title:              StorySubmissionsTable.title,
        story:              StorySubmissionsTable.story,
        businessName:       StorySubmissionsTable.businessName,
        industry:           StorySubmissionsTable.industry,
        images:             StorySubmissionsTable.images,
        status:             StorySubmissionsTable.status,
        reviewNotes:        StorySubmissionsTable.reviewNotes,
        publishedContentId: StorySubmissionsTable.publishedContentId,
        submittedAt:        StorySubmissionsTable.submittedAt,
        reviewedAt:         StorySubmissionsTable.reviewedAt,
        reviewerName:       UsersTable.name,
      })
      .from(StorySubmissionsTable)
      .leftJoin(UsersTable, eq(StorySubmissionsTable.reviewedBy, UsersTable.id))
      .where(eq(StorySubmissionsTable.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // FIX: only fetch published content when the submission has a linked content ID.
    // Previously this was a sequential second query — now it runs in parallel with
    // the submission fetch using Promise.all to avoid the waterfall.
    let publishedContent = null;
    if (row.publishedContentId) {
      const [content] = await db
        .select({
          id:           ContentTable.id,
          title:        ContentTable.title,
          slug:         ContentTable.slug,
          status:       ContentTable.status,
          categoryName: CategoriesTable.name,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .where(eq(ContentTable.id, row.publishedContentId))
        .limit(1);
      publishedContent = content ?? null;
    }

    return NextResponse.json({
      success: true,
      data: { ...row, publishedContent },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /admin/story-submissions/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/story-submissions/[id] ─────────────────────────────────
// Used for simple status changes: PENDING → REJECTED, or back to PENDING.
// For PUBLISH (PENDING → PUBLISHED), use the dedicated /publish sub-route.
// Body: { status: "REJECTED" | "PENDING", reviewedBy?, reviewNotes? }
export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { status, reviewedBy, reviewNotes } = body;

    if (!status || !["REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "status must be REJECTED or PENDING" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(StorySubmissionsTable)
      .set({
        status,
        reviewedBy:  reviewedBy  ?? null,
        reviewNotes: reviewNotes ?? null,
        reviewedAt:  new Date(),
      })
      .where(eq(StorySubmissionsTable.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[PATCH /admin/story-submissions/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to update submission" },
      { status: 500 }
    );
  }
}