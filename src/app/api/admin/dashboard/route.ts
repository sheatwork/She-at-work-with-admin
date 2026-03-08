// app/api/admin/dashboard/route.ts
// ADMIN + SUPER_ADMIN: single endpoint that returns all dashboard stats
// in ONE request — replaces the old pattern of 4 separate fetches.
//
// All counts run in a single Promise.all → one parallel round-trip to Neon.
// Recent items (last 5 of each type) are fetched in the same batch.

import { db } from "@/db";
import {
  CategoriesTable,
  ContactSubmissionsTable,
  ContentTable,
  StorySubmissionsTable,
  UsersTable,
} from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

const HEADERS = {
  "Cache-Control": "private, no-store", // dashboard data is user-specific, never CDN-cached
};

export async function GET() {
  try {
    // ── All counts + recent rows in ONE parallel batch ────────────────────────
    const [
      contentStatusCounts,
      storyStatusCounts,
      contactCounts,
      userCounts,
      recentContent,
      recentStories,
      recentContacts,
    ] = await Promise.all([

      // Content counts grouped by status — single query, no N+1
      db
        .select({ status: ContentTable.status, total: count() })
        .from(ContentTable)
        .groupBy(ContentTable.status),

      // Story submission counts grouped by status
      db
        .select({ status: StorySubmissionsTable.status, total: count() })
        .from(StorySubmissionsTable)
        .groupBy(StorySubmissionsTable.status),

      // Contact counts: total + unresolved
      db
        .select({
          total:      count(),
          unresolved: sql<number>`sum(case when ${ContactSubmissionsTable.isResolved} = false then 1 else 0 end)`,
        })
        .from(ContactSubmissionsTable),

      // User counts grouped by role
      db
        .select({ role: UsersTable.role, total: count() })
        .from(UsersTable)
        .groupBy(UsersTable.role),

      // Recent 5 content items — for the activity feed
      db
        .select({
          id:          ContentTable.id,
          title:       ContentTable.title,
          slug:        ContentTable.slug,
          contentType: ContentTable.contentType,
          status:      ContentTable.status,
          authorName:  ContentTable.authorName,
          categoryName:CategoriesTable.name,
          createdAt:   ContentTable.createdAt,
          publishedAt: ContentTable.publishedAt,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .orderBy(desc(ContentTable.createdAt))
        .limit(5),

      // Recent 5 story submissions
      db
        .select({
          id:           StorySubmissionsTable.id,
          title:        StorySubmissionsTable.title,
          name:         StorySubmissionsTable.name,
          businessName: StorySubmissionsTable.businessName,
          status:       StorySubmissionsTable.status,
          submittedAt:  StorySubmissionsTable.submittedAt,
        })
        .from(StorySubmissionsTable)
        .orderBy(desc(StorySubmissionsTable.submittedAt))
        .limit(5),

      // Recent 5 unresolved contacts
      db
        .select({
          id:          ContactSubmissionsTable.id,
          name:        ContactSubmissionsTable.name,
          email:       ContactSubmissionsTable.email,
          subject:     ContactSubmissionsTable.subject,
          isResolved:  ContactSubmissionsTable.isResolved,
          submittedAt: ContactSubmissionsTable.submittedAt,
        })
        .from(ContactSubmissionsTable)
        .where(eq(ContactSubmissionsTable.isResolved, false))
        .orderBy(desc(ContactSubmissionsTable.submittedAt))
        .limit(5),
    ]);

    // ── Flatten content status counts ─────────────────────────────────────────
    const contentByStatus = Object.fromEntries(
      contentStatusCounts.map((r) => [r.status, Number(r.total)])
    );

    // ── Flatten story status counts ───────────────────────────────────────────
    const storiesByStatus = Object.fromEntries(
      storyStatusCounts.map((r) => [r.status, Number(r.total)])
    );

    // ── Flatten user counts ───────────────────────────────────────────────────
    const usersByRole = Object.fromEntries(
      userCounts.map((r) => [r.role, Number(r.total)])
    );

    return NextResponse.json(
      {
        stats: {
          content: {
            published: contentByStatus["PUBLISHED"] ?? 0,
            pending:   contentByStatus["PENDING"]   ?? 0,
            draft:     contentByStatus["DRAFT"]     ?? 0,
            rejected:  contentByStatus["REJECTED"]  ?? 0,
            total: Object.values(contentByStatus).reduce((a, b) => a + b, 0),
          },
          stories: {
            pending:  storiesByStatus["PENDING"]  ?? 0,
            approved: storiesByStatus["APPROVED"] ?? 0,
            rejected: storiesByStatus["REJECTED"] ?? 0,
            total: Object.values(storiesByStatus).reduce((a, b) => a + b, 0),
          },
          contacts: {
            total:      Number(contactCounts[0]?.total      ?? 0),
            unresolved: Number(contactCounts[0]?.unresolved ?? 0),
          },
          users: {
            total:       Object.values(usersByRole).reduce((a, b) => a + b, 0),
            users:       usersByRole["USER"]        ?? 0,
            admins:      usersByRole["ADMIN"]       ?? 0,
            superAdmins: usersByRole["SUPER_ADMIN"] ?? 0,
          },
        },
        recent: {
          content:  recentContent,
          stories:  recentStories,
          contacts: recentContacts,
        },
      },
      { headers: HEADERS }
    );
  } catch (err) {
    console.error("[GET /api/admin/dashboard]", err);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}