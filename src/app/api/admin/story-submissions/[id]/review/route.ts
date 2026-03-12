// app/api/admin/story-submissions/[id]/review/route.ts
// SUPER_ADMIN + ADMIN: approve / reject a submission (status-only update)
// For full publish flow (creates a content row), use the /publish sub-route instead.

import { db } from "@/db";
import { StorySubmissionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ─── PATCH /api/admin/story-submissions/[id]/review ───────────────────────────
// Body: { status: "PUBLISHED" | "REJECTED", reviewedBy, reviewNotes?, publishedContentId? }
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { status, reviewedBy, reviewNotes, publishedContentId } = body;

    if (!status || !["PUBLISHED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "status must be PUBLISHED or REJECTED" },
        { status: 400 }
      );
    }
    if (!reviewedBy) {
      return NextResponse.json(
        { success: false, error: "reviewedBy is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(StorySubmissionsTable)
      .set({
        status,
        reviewedBy,
        reviewNotes:        reviewNotes        ?? null,
        publishedContentId: publishedContentId ?? null,
        reviewedAt:         new Date(),
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
      console.error("[PATCH /admin/story-submissions/:id/review]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to review submission" },
      { status: 500 }
    );
  }
}