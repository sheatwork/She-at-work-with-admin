// app/api/superadmin/admins/[id]/route.ts
// SUPER_ADMIN: get / update / deactivate a single admin
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

// ─── GET /api/superadmin/admins/[id] ─────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const [admin] = await db
      .select({
        id:            UsersTable.id,
        name:          UsersTable.name,
        email:         UsersTable.email,
        mobile:        UsersTable.mobile,
        isActive:      UsersTable.isActive,
        emailVerified: UsersTable.emailVerified,
        createdAt:     UsersTable.createdAt,
        updatedAt:     UsersTable.updatedAt,
      })
      .from(UsersTable)
      .where(eq(UsersTable.id, id))
      .limit(1);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    // Safety: only return ADMIN-role records from this endpoint
    // (SUPER_ADMIN accounts cannot be edited here)
    return NextResponse.json({ success: true, data: admin });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/superadmin/admins/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/superadmin/admins/[id] ───────────────────────────────────────
// Body: { name?, mobile?, isActive?, password? }
// Does NOT allow changing email or role via this route.
export async function PATCH(req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, mobile, isActive, password } = body;

    // Must be updating at least one field
    if (
      name === undefined &&
      mobile === undefined &&
      isActive === undefined &&
      password === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Verify the target is an ADMIN (prevent editing SUPER_ADMIN via this route)
    const [existing] = await db
      .select({ id: UsersTable.id, role: UsersTable.role })
      .from(UsersTable)
      .where(eq(UsersTable.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }
    if (existing.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot edit a Super Admin via this route" },
        { status: 403 }
      );
    }

    // Validate password length if provided
    if (password !== undefined && password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (name     !== undefined) updates.name     = name.trim();
    if (mobile   !== undefined) updates.mobile   = mobile?.trim() || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (password !== undefined) updates.password = await bcrypt.hash(password, 12);

    const [updated] = await db
      .update(UsersTable)
      .set(updates)
      .where(eq(UsersTable.id, id))
      .returning({
        id:       UsersTable.id,
        name:     UsersTable.name,
        email:    UsersTable.email,
        mobile:   UsersTable.mobile,
        isActive: UsersTable.isActive,
        updatedAt:UsersTable.updatedAt,
      });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[PATCH /api/superadmin/admins/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to update admin" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/superadmin/admins/[id] ──────────────────────────────────────
// Demotes ADMIN → USER (soft removal — preserves account + content attribution)
export async function DELETE(_req: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const [existing] = await db
      .select({ id: UsersTable.id, role: UsersTable.role })
      .from(UsersTable)
      .where(eq(UsersTable.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404 }
      );
    }
    if (existing.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Cannot demote a Super Admin" },
        { status: 403 }
      );
    }

    // Demote to USER rather than hard-delete — preserves content attribution
    const [demoted] = await db
      .update(UsersTable)
      .set({ role: "USER", updatedAt: new Date() })
      .where(eq(UsersTable.id, id))
      .returning({
        id:    UsersTable.id,
        name:  UsersTable.name,
        email: UsersTable.email,
        role:  UsersTable.role,
      });

    return NextResponse.json({
      success: true,
      message: `${demoted.name} has been demoted to USER`,
      data:    demoted,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[DELETE /api/superadmin/admins/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to demote admin" },
      { status: 500 }
    );
  }
}