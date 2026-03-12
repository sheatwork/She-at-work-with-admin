// app/api/admin/categories/[id]/route.ts
// SUPER_ADMIN + ADMIN: get / update / delete a single category
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { CategoriesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── GET /api/admin/categories/[id] ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const [category] = await db
      .select()
      .from(CategoriesTable)
      .where(eq(CategoriesTable.id, id))
      .limit(1);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /admin/categories/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/admin/categories/[id] ────────────────────────────────────────
// Body: { name?, description?, isActive? }
// NOTE: contentType is intentionally NOT updatable — changing it would break
// the slug uniqueness constraint and orphan existing content rows.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { name, description, isActive } = body;

    // Only set fields that were actually sent in the request body
    const updates: Partial<typeof CategoriesTable.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name.trim();
      // FIX: auto-update slug when name changes so they stay in sync
      updates.slug = toSlug(name);
    }
    if (description !== undefined) updates.description = description?.trim() ?? null;
    if (isActive    !== undefined) updates.isActive    = isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(CategoriesTable)
      .set(updates)
      .where(eq(CategoriesTable.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    // Catch Postgres unique-violation (slug + contentType collision on rename)
    if (err?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "A category with this name already exists for this content type",
        },
        { status: 409 }
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[PATCH /admin/categories/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/admin/categories/[id] ───────────────────────────────────────
// Soft delete (sets isActive = false) to preserve content foreign keys.
// Content rows referencing this category are NOT affected.
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const [updated] = await db
      .update(CategoriesTable)
      .set({ isActive: false })
      .where(eq(CategoriesTable.id, id))
      .returning({ id: CategoriesTable.id });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Category deactivated" });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[DELETE /admin/categories/:id]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}