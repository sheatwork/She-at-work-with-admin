// app/api/story-submissions/route.ts
// PUBLIC: Submit a new story
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import { StorySubmissionsTable } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

// ─── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TITLE = 300;
const MAX_STORY = 50_000; // ~10,000 words — prevent huge payloads

// ─── POST /api/story-submissions ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // FIX: guard against non-JSON bodies (e.g. accidental form posts)
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

    const { name, email, phone, title, story, businessName, industry, images } = body;

    // ── Required field presence ───────────────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !title?.trim() || !story?.trim()) {
      return NextResponse.json(
        { success: false, message: "name, email, title and story are required" },
        { status: 400 }
      );
    }

    // ── Format + length validation ────────────────────────────────────────────
    // FIX: previously any string passed as email was accepted — validate format
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    // FIX: no length caps meant arbitrarily large payloads could be stored
    if (title.trim().length > MAX_TITLE) {
      return NextResponse.json(
        { success: false, message: `Title must be ${MAX_TITLE} characters or fewer` },
        { status: 400 }
      );
    }
    if (story.trim().length > MAX_STORY) {
      return NextResponse.json(
        { success: false, message: `Story must be ${MAX_STORY} characters or fewer` },
        { status: 400 }
      );
    }

    // FIX: validate images is an array of strings when provided — a non-array
    // value here would silently corrupt the images column
    if (images !== undefined && images !== null) {
      if (
        !Array.isArray(images) ||
        images.some((url: any) => typeof url !== "string" || !url.trim())
      ) {
        return NextResponse.json(
          { success: false, message: "images must be an array of URL strings" },
          { status: 400 }
        );
      }
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const [submission] = await db
      .insert(StorySubmissionsTable)
      .values({
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        phone:        phone?.trim()        || null,
        title:        title.trim(),
        story:        story.trim(),
        businessName: businessName?.trim() || null,
        industry:     industry?.trim()     || null,
        images:       images               ?? null,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: "Story submitted successfully",
        data:    submission,
      },
      { status: 201 }
    );
  } catch (err) {
    // FIX: dev-only logging — no sensitive submission data in production logs
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/story-submissions]", err);
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}