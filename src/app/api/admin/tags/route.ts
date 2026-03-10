import { db } from "@/db";
import { TagsTable } from "@/db/schema";
import { desc, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const offset = (page - 1) * limit;

    let query = db.select().from(TagsTable);

    if (search) {
      query = query.where(
        or(
          ilike(TagsTable.name, `%${search}%`),
          ilike(TagsTable.slug, `%${search}%`)
        )
      ) as typeof query;
    }

    const tags = await query
      .orderBy(desc(TagsTable.usageCount), desc(TagsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(TagsTable);

    return NextResponse.json({
      success: true,
      data: tags,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (err) {
    console.error("[GET /admin/tags]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // Check if tag already exists
    const [existing] = await db
      .select()
      .from(TagsTable)
      .where(sql`${TagsTable.slug} = ${slug}`)
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Tag already exists" },
        { status: 409 }
      );
    }

    const [newTag] = await db
      .insert(TagsTable)
      .values({
        name: name.trim(),
        slug,
        usageCount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: newTag }, { status: 201 });
  } catch (err) {
    console.error("[POST /admin/tags]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create tag" },
      { status: 500 }
    );
  }
}