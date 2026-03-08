// app/api/admin/contact-submissions/[id]/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ContactSubmissionsTable } from "@/db/schema";
import { eq } from "drizzle-orm";



export async function PATCH(req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { resolvedBy, notes } = body;

    if (!resolvedBy) {
      return NextResponse.json({ success: false, error: "resolvedBy is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(ContactSubmissionsTable)
      .set({
        isResolved: true,
        resolvedBy,
        resolvedAt: new Date(),
        notes: notes ?? null,
      })
      .where(eq(ContactSubmissionsTable.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /admin/contact-submissions/:id/resolve]", err);
    return NextResponse.json({ success: false, error: "Failed to resolve contact" }, { status: 500 });
  }
}