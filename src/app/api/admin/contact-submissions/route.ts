// app/api/admin/contact-submissions/route.ts
// ADMIN: paginated list of contact submissions
// Query: ?isResolved=false&page=1&limit=20&search=

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ContactSubmissionsTable, UsersTable } from "@/db/schema";
import { eq, and, desc, count, ilike, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isResolved = searchParams.get("isResolved");
    const search     = searchParams.get("search")?.trim() || null;
    const page       = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit      = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const offset     = (page - 1) * limit;

    const conditions = [];
    if (isResolved === "true")  conditions.push(eq(ContactSubmissionsTable.isResolved, true));
    if (isResolved === "false") conditions.push(eq(ContactSubmissionsTable.isResolved, false));
    if (search) {
      conditions.push(
        or(
          ilike(ContactSubmissionsTable.name,    `%${search}%`),
          ilike(ContactSubmissionsTable.email,   `%${search}%`),
          ilike(ContactSubmissionsTable.subject, `%${search}%`),
          ilike(ContactSubmissionsTable.message, `%${search}%`),
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
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
        .where(where)
        .orderBy(desc(ContactSubmissionsTable.submittedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(ContactSubmissionsTable).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error("[GET /admin/contact-submissions]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch contacts" }, { status: 500 });
  }
}