// app/api/superadmin/admins/[id]/route.ts
// SUPER_ADMIN only: get, update, delete a single admin

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";



// ─── GET /api/superadmin/admins/[id] ─────────────────────────────────────────
export async function GET(_req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const [admin] = await db
      .select({
        id: UsersTable.id,
        name: UsersTable.name,
        email: UsersTable.email,
        mobile: UsersTable.mobile,
        image: UsersTable.image,
        isActive: UsersTable.isActive,
        emailVerified: UsersTable.emailVerified,
        createdAt: UsersTable.createdAt,
        updatedAt: UsersTable.updatedAt,
      })
      .from(UsersTable)
      .where(
        and(
          eq(UsersTable.id, id),
          eq(UsersTable.role, "ADMIN") // ✅ scope to ADMIN only — superadmin can't be fetched here
        )
      )
      .limit(1);

    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: admin });
  } catch (err) {
    console.error("[GET /superadmin/admins/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch admin" }, { status: 500 });
  }
}

// ─── PATCH /api/superadmin/admins/[id] ───────────────────────────────────────
// Partial update: name, mobile, image, isActive, password
export async function PATCH(req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { name, mobile, image, isActive, password } = body;

    // ── Build update payload — only include provided fields ───────────────────
    // ✅ Avoids overwriting untouched columns and keeps the UPDATE query small
    const updates: Partial<typeof UsersTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (mobile !== undefined) updates.mobile = mobile;
    if (image !== undefined) updates.image = image;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(UsersTable)
      .set(updates)
      .where(
        and(
          eq(UsersTable.id, id),
          eq(UsersTable.role, "ADMIN")
        )
      )
      .returning({
        id: UsersTable.id,
        name: UsersTable.name,
        email: UsersTable.email,
        isActive: UsersTable.isActive,
        updatedAt: UsersTable.updatedAt,
      });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /superadmin/admins/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to update admin" }, { status: 500 });
  }
}

// ─── DELETE /api/superadmin/admins/[id] ──────────────────────────────────────
// Hard delete — or swap for soft delete (isActive = false) if preferred
export async function DELETE(_req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const [deleted] = await db
      .delete(UsersTable)
      .where(
        and(
          eq(UsersTable.id, id),
          eq(UsersTable.role, "ADMIN") // ✅ can never accidentally delete a SUPER_ADMIN
        )
      )
      .returning({ id: UsersTable.id });

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Admin deleted" });
  } catch (err) {
    console.error("[DELETE /superadmin/admins/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to delete admin" }, { status: 500 });
  }
}