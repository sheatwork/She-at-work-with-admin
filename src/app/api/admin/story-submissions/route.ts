// app/api/admin/story-submissions/route.ts
// SUPER_ADMIN + ADMIN: list story submissions

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { StorySubmissionsTable, UsersTable } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

// ─── GET /api/admin/story-submissions ────────────────────────────────────────
// Query: ?status=PENDING&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as typeof StorySubmissionsTable.$inferSelect["status"] | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(StorySubmissionsTable.status, status));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: StorySubmissionsTable.id,
          name: StorySubmissionsTable.name,
          email: StorySubmissionsTable.email,
          phone: StorySubmissionsTable.phone,
          title: StorySubmissionsTable.title,
          businessName: StorySubmissionsTable.businessName,
          industry: StorySubmissionsTable.industry,
          status: StorySubmissionsTable.status,
          submittedAt: StorySubmissionsTable.submittedAt,
          reviewedAt: StorySubmissionsTable.reviewedAt,
          reviewerName: UsersTable.name,
        })
        .from(StorySubmissionsTable)
        .leftJoin(UsersTable, eq(StorySubmissionsTable.reviewedBy, UsersTable.id))
        .where(whereClause)
        .orderBy(desc(StorySubmissionsTable.submittedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(StorySubmissionsTable).where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error("[GET /admin/story-submissions]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch submissions" }, { status: 500 });
  }
}