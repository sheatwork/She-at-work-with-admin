// app/api/superadmin/export/route.ts
// SUPER_ADMIN: CSV export for users or content
// POST body: { entity: "users" | "content" }
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { ContentTable, UsersTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: any) => {
    const s = v == null ? "" : String(v);
    // wrap in quotes if the value contains comma, quote, or newline
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { entity } = body;

    if (!entity || !["users", "content"].includes(entity)) {
      return NextResponse.json(
        { success: false, error: "entity must be 'users' or 'content'" },
        { status: 400 }
      );
    }

    let csv    = "";
    let filename = "";

    if (entity === "users") {
      const rows = await db
        .select({
          id:            UsersTable.id,
          name:          UsersTable.name,
          email:         UsersTable.email,
          role:          UsersTable.role,
          isActive:      UsersTable.isActive,
          emailVerified: UsersTable.emailVerified,
          createdAt:     UsersTable.createdAt,
        })
        .from(UsersTable)
        .orderBy(desc(UsersTable.createdAt));

      csv      = toCSV(rows);
      filename = `users_${new Date().toISOString().split("T")[0]}.csv`;
    }

    if (entity === "content") {
      const rows = await db
        .select({
          id:          ContentTable.id,
          title:       ContentTable.title,
          slug:        ContentTable.slug,
          contentType: ContentTable.contentType,
          status:      ContentTable.status,
          authorName:  ContentTable.authorName,
          publishedAt: ContentTable.publishedAt,
          createdAt:   ContentTable.createdAt,
          updatedAt:   ContentTable.updatedAt,
        })
        .from(ContentTable)
        .orderBy(desc(ContentTable.createdAt));

      csv      = toCSV(rows);
      filename = `content_${new Date().toISOString().split("T")[0]}.csv`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/superadmin/export]", err);
    }
    return NextResponse.json(
      { success: false, error: "Export failed" },
      { status: 500 }
    );
  }
}