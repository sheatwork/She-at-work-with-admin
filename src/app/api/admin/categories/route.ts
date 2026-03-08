// app/api/admin/categories/route.ts
// SUPER_ADMIN + ADMIN: list categories
// SUPER_ADMIN only: create category

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { CategoriesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── GET /api/admin/categories ────────────────────────────────────────────────
// Query params: ?contentType=BLOG&activeOnly=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType") as typeof CategoriesTable.$inferSelect["contentType"] | null;
    const activeOnly = searchParams.get("activeOnly") !== "false"; // default true

    // ✅ Build conditions array — avoids multiple chained .where() calls
    const conditions = [];
    if (activeOnly) conditions.push(eq(CategoriesTable.isActive, true));
    if (contentType) conditions.push(eq(CategoriesTable.contentType, contentType));

    const categories = await db
      .select()
      .from(CategoriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    console.error("[GET /admin/categories]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}

// ─── POST /api/admin/categories ───────────────────────────────────────────────
// Body: { name, contentType, description? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, contentType, description } = body;

    if (!name || !contentType) {
      return NextResponse.json(
        { success: false, error: "name and contentType are required" },
        { status: 400 }
      );
    }

    const slug = toSlug(name);

    // ── Check slug+contentType uniqueness (matches your DB unique index) ───────
    const existing = await db
      .select({ id: CategoriesTable.id })
      .from(CategoriesTable)
      .where(
        and(
          eq(CategoriesTable.slug, slug),
          eq(CategoriesTable.contentType, contentType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `A '${contentType}' category with this name already exists` },
        { status: 409 }
      );
    }

    const [category] = await db
      .insert(CategoriesTable)
      .values({
        name: name.trim(),
        slug,
        contentType,
        description: description?.trim() ?? null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err) {
    console.error("[POST /admin/categories]", err);
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 });
  }
}