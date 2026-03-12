// app/api/admin/categories/route.ts
// SUPER_ADMIN + ADMIN: list categories
// SUPER_ADMIN only: create category
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { CategoriesTable } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── GET /api/admin/categories ────────────────────────────────────────────────
// Query: ?contentType=BLOG&activeOnly=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentType = searchParams.get("contentType") as
      | typeof CategoriesTable.$inferSelect["contentType"]
      | null;
    // FIX: default activeOnly=true only when the param is explicitly "false"
    // so ?activeOnly=false correctly returns inactive categories too
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const conditions = [];
    if (activeOnly)   conditions.push(eq(CategoriesTable.isActive,    true));
    if (contentType)  conditions.push(eq(CategoriesTable.contentType, contentType));

    const categories = await db
      .select()
      .from(CategoriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      // FIX: order alphabetically so dropdowns are consistent everywhere
      .orderBy(asc(CategoriesTable.name));

    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /admin/categories]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
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

    // Check slug + contentType uniqueness before insert to give a clear error
    // (the DB unique index would also catch this, but the PG error message is
    //  less user-friendly than the one we build here)
    const existing = await db
      .select({ id: CategoriesTable.id })
      .from(CategoriesTable)
      .where(
        and(
          eq(CategoriesTable.slug,        slug),
          eq(CategoriesTable.contentType, contentType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `A '${contentType}' category with this name already exists`,
        },
        { status: 409 }
      );
    }

    const [category] = await db
      .insert(CategoriesTable)
      .values({
        name:        name.trim(),
        slug,
        contentType,
        description: description?.trim() ?? null,
        isActive:    true,
      })
      .returning();

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err: any) {
    // Fallback for any race-condition duplicate that slips past the pre-check
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
      console.error("[POST /admin/categories]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}