// app/api/contact-submissions/route.ts
// PUBLIC: Submit a contact message
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { ContactSubmissionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

// ─── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME      = 200;
const MAX_SUBJECT   = 300;
const MAX_MESSAGE   = 10_000;

// ─── POST /api/contact-submissions ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // FIX: guard against non-JSON bodies
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, message: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message } = body;

    // ── Required field presence ───────────────────────────────────────────────
    // FIX: .trim() checks — whitespace-only strings no longer pass validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, message: "name, email and message are required" },
        { status: 400 }
      );
    }

    // ── Format + length validation ────────────────────────────────────────────
    // FIX: email format was never validated — any string was accepted
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    // FIX: no length caps meant arbitrarily large payloads could be stored
    if (name.trim().length > MAX_NAME) {
      return NextResponse.json(
        { success: false, message: `Name must be ${MAX_NAME} characters or fewer` },
        { status: 400 }
      );
    }
    if (subject && subject.trim().length > MAX_SUBJECT) {
      return NextResponse.json(
        { success: false, message: `Subject must be ${MAX_SUBJECT} characters or fewer` },
        { status: 400 }
      );
    }
    if (message.trim().length > MAX_MESSAGE) {
      return NextResponse.json(
        { success: false, message: `Message must be ${MAX_MESSAGE} characters or fewer` },
        { status: 400 }
      );
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const [submission] = await db
      .insert(ContactSubmissionsTable)
      .values({
        name:    name.trim(),
        email:   email.trim().toLowerCase(), // FIX: normalise for dedup/search
        phone:   phone?.trim()   || null,
        subject: subject?.trim() || null,
        message: message.trim(),
        // isResolved defaults to false, submittedAt defaults automatically
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Your message has been submitted successfully",
        data:    submission,
      },
      { status: 201 }
    );
  } catch (err) {
    // FIX: dev-only logging — no contact data leaked in production logs
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/contact-submissions]", err);
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}