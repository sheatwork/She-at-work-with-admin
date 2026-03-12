// app/api/superadmin/admins/route.ts
// SUPER_ADMIN: list admins + promote a user to ADMIN
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /api/superadmin/admins ───────────────────────────────────────────────
// Query: ?page=1&limit=20&search=&status=active|inactive
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status"); // "active" | "inactive" | null

    const conditions = [
      // only ADMIN role (not SUPER_ADMIN — they manage separately)
      sql`${UsersTable.role} = 'ADMIN'`,
    ];

    if (search) {
      conditions.push(
        or(
          ilike(UsersTable.name,  `%${search}%`),
          ilike(UsersTable.email, `%${search}%`),
        )!
      );
    }
    if (status === "active")   conditions.push(eq(UsersTable.isActive, true));
    if (status === "inactive") conditions.push(eq(UsersTable.isActive, false));

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db
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
        .where(where)
        .orderBy(desc(UsersTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(UsersTable).where(where),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total:      Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/superadmin/admins]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

// ─── POST /api/superadmin/admins ──────────────────────────────────────────────
// Create a new admin account directly
// Body: { name, email, password, mobile? }
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    let body: any;
    try { body = await req.json(); }
    catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, email, password, mobile } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "name, email and password are required" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check duplicate email
    const [existing] = await db
      .select({ id: UsersTable.id })
      .from(UsersTable)
      .where(eq(UsersTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const [admin] = await db
      .insert(UsersTable)
      .values({
        name:          name.trim(),
        email:         email.trim().toLowerCase(),
        password:      hashed,
        mobile:        mobile?.trim() || null,
        role:          "ADMIN",
        isActive:      true,
        emailVerified: new Date(), // super admin creates verified accounts
      })
      .returning({
        id:        UsersTable.id,
        name:      UsersTable.name,
        email:     UsersTable.email,
        mobile:    UsersTable.mobile,
        isActive:  UsersTable.isActive,
        createdAt: UsersTable.createdAt,
      });

    return NextResponse.json(
      { success: true, data: admin },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/superadmin/admins]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to create admin" },
      { status: 500 }
    );
  }
}