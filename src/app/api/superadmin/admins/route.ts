// app/api/superadmin/admins/route.ts
// SUPER_ADMIN only: list all admins + create new admin
/*eslint-disable @typescript-eslint/no-unused-vars */

import { db } from "@/db";
import { UsersTable } from "@/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/superadmin/admins ───────────────────────────────────────────────
// Returns all ADMIN users (never returns SUPER_ADMIN or passwords)
export async function GET(req: NextRequest) {
  try {
    // ✅ Select only needed columns — never pull password, reduces payload size
    const admins = await db
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
      .where(eq(UsersTable.role, "ADMIN"));

    return NextResponse.json({ success: true, data: admins });
  } catch (err) {
    console.error("[GET /superadmin/admins]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch admins" }, { status: 500 });
  }
}

// ─── POST /api/superadmin/admins ──────────────────────────────────────────────
// Create a new ADMIN user
// Body: { name, email, password, mobile? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, mobile } = body;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "name, email and password are required" },
        { status: 400 }
      );
    }

    // ── Check duplicate email ─────────────────────────────────────────────────
    // ✅ Use .limit(1) — stops scan at first match, much cheaper than full query
    const existing = await db
      .select({ id: UsersTable.id })
      .from(UsersTable)
      .where(eq(UsersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    // ✅ rounds=10 is the sweet spot — 12+ is noticeably slower on Vercel serverless
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Insert ────────────────────────────────────────────────────────────────
    const [newAdmin] = await db
      .insert(UsersTable)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        mobile: mobile ?? null,
        role: "ADMIN",
        isActive: true,
      })
      .returning({
        id: UsersTable.id,
        name: UsersTable.name,
        email: UsersTable.email,
        role: UsersTable.role,
        isActive: UsersTable.isActive,
        createdAt: UsersTable.createdAt,
      });

    return NextResponse.json({ success: true, data: newAdmin }, { status: 201 });
  } catch (err) {
    console.error("[POST /superadmin/admins]", err);
    return NextResponse.json({ success: false, error: "Failed to create admin" }, { status: 500 });
  }
}