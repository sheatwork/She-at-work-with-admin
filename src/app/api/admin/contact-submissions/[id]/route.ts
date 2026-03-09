// app/api/admin/contact-submissions/[id]/route.ts
// ADMIN: get single contact + resolve / unresolve

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ContactSubmissionsTable, UsersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type Context = { params: Promise<{ id: string }> };

// ─── GET /api/admin/contact-submissions/[id] ──────────────────────────────────
export async function GET(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const [row] = await db
      .select({
        id:           ContactSubmissionsTable.id,
        name:         ContactSubmissionsTable.name,
        email:        ContactSubmissionsTable.email,
        phone:        ContactSubmissionsTable.phone,
        subject:      ContactSubmissionsTable.subject,
        message:      ContactSubmissionsTable.message,
        isResolved:   ContactSubmissionsTable.isResolved,
        resolvedAt:   ContactSubmissionsTable.resolvedAt,
        notes:        ContactSubmissionsTable.notes,
        submittedAt:  ContactSubmissionsTable.submittedAt,
        resolverName: UsersTable.name,
      })
      .from(ContactSubmissionsTable)
      .leftJoin(UsersTable, eq(ContactSubmissionsTable.resolvedBy, UsersTable.id))
      .where(eq(ContactSubmissionsTable.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error("[GET /admin/contact-submissions/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch contact" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/contact-submissions/[id] ────────────────────────────────
// Body: { isResolved: boolean, resolvedBy?: string, notes?: string }
// Supports both resolving AND unresolving (isResolved: false clears resolver fields)
export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { isResolved, resolvedBy, notes } = body;

    if (typeof isResolved !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isResolved (boolean) is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(ContactSubmissionsTable)
      .set(
        isResolved
          ? {
              isResolved:  true,
              resolvedBy:  resolvedBy ?? null,
              resolvedAt:  new Date(),
              notes:       notes ?? null,
            }
          : {
              // Unresolve — clear all resolution fields
              isResolved:  false,
              resolvedBy:  null,
              resolvedAt:  null,
              notes:       null,
            }
      )
      .where(eq(ContactSubmissionsTable.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /admin/contact-submissions/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to update contact" }, { status: 500 });
  }
}