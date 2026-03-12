// app/api/superadmin/analytics/route.ts
// SUPER_ADMIN: system-wide stats in a single request — all counts run in parallel

import { db } from "@/db";
import {
  ContactSubmissionsTable,
  ContentTable,
  StorySubmissionsTable,
  UsersTable,
} from "@/db/schema";
import { count, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      // ── Users ──────────────────────────────────────────────────────────────
      [{ totalUsers }],
      [{ activeUsers }],
      [{ adminCount }],
      [{ newUsersThisMonth }],

      // ── Content ────────────────────────────────────────────────────────────
      [{ totalContent }],
      [{ publishedContent }],
      [{ pendingContent }],
      [{ draftContent }],

      // ── Story Submissions ──────────────────────────────────────────────────
      [{ totalStories }],
      [{ pendingStories }],
      [{ publishedStories }],
      [{ rejectedStories }],

      // ── Contact Submissions ────────────────────────────────────────────────
      [{ totalContacts }],
      [{ unresolvedContacts }],
      [{ resolvedContacts }],
      [{ newContactsThisMonth }],
    ] = await Promise.all([
      // Users
      db.select({ totalUsers: count() }).from(UsersTable),
      db.select({ activeUsers: count() }).from(UsersTable).where(eq(UsersTable.isActive, true)),
      db.select({ adminCount: count() }).from(UsersTable).where(
        sql`${UsersTable.role} IN ('ADMIN', 'SUPER_ADMIN')`
      ),
      db.select({ newUsersThisMonth: count() }).from(UsersTable).where(
        gte(UsersTable.createdAt, thirtyDaysAgo)
      ),

      // Content
      db.select({ totalContent: count() }).from(ContentTable),
      db.select({ publishedContent: count() }).from(ContentTable).where(
        eq(ContentTable.status, "PUBLISHED")
      ),
      db.select({ pendingContent: count() }).from(ContentTable).where(
        eq(ContentTable.status, "PENDING")
      ),
      db.select({ draftContent: count() }).from(ContentTable).where(
        eq(ContentTable.status, "DRAFT")
      ),

      // Story submissions
      db.select({ totalStories: count() }).from(StorySubmissionsTable),
      db.select({ pendingStories: count() }).from(StorySubmissionsTable).where(
        eq(StorySubmissionsTable.status, "PENDING")
      ),
      db.select({ publishedStories: count() }).from(StorySubmissionsTable).where(
        eq(StorySubmissionsTable.status, "PUBLISHED")
      ),
      db.select({ rejectedStories: count() }).from(StorySubmissionsTable).where(
        eq(StorySubmissionsTable.status, "REJECTED")
      ),

      // Contact submissions
      db.select({ totalContacts: count() }).from(ContactSubmissionsTable),
      db.select({ unresolvedContacts: count() }).from(ContactSubmissionsTable).where(
        eq(ContactSubmissionsTable.isResolved, false)
      ),
      db.select({ resolvedContacts: count() }).from(ContactSubmissionsTable).where(
        eq(ContactSubmissionsTable.isResolved, true)
      ),
      db.select({ newContactsThisMonth: count() }).from(ContactSubmissionsTable).where(
        gte(ContactSubmissionsTable.submittedAt, thirtyDaysAgo)
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total:          Number(totalUsers),
          active:         Number(activeUsers),
          inactive:       Number(totalUsers) - Number(activeUsers),
          admins:         Number(adminCount),
          newThisMonth:   Number(newUsersThisMonth),
        },
        content: {
          total:     Number(totalContent),
          published: Number(publishedContent),
          pending:   Number(pendingContent),
          draft:     Number(draftContent),
        },
        stories: {
          total:     Number(totalStories),
          pending:   Number(pendingStories),
          published: Number(publishedStories),
          rejected:  Number(rejectedStories),
        },
        contacts: {
          total:          Number(totalContacts),
          unresolved:     Number(unresolvedContacts),
          resolved:       Number(resolvedContacts),
          newThisMonth:   Number(newContactsThisMonth),
        },
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/superadmin/analytics]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}