// app/api/superadmin/recent-activity/route.ts
// SUPER_ADMIN: latest activity across all tables — replaces the missing audit log
/*eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/db";
import {
  ContactSubmissionsTable,
  ContentTable,
  StorySubmissionsTable,
  UsersTable,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [newUsers, recentContent, recentStories, recentContacts] =
      await Promise.all([
        // 5 newest users
        db
          .select({
            id:        UsersTable.id,
            name:      UsersTable.name,
            email:     UsersTable.email,
            role:      UsersTable.role,
            isActive:  UsersTable.isActive,
            createdAt: UsersTable.createdAt,
          })
          .from(UsersTable)
          .orderBy(desc(UsersTable.createdAt))
          .limit(5),

        // 5 most recently updated content items
        db
          .select({
            id:          ContentTable.id,
            title:       ContentTable.title,
            contentType: ContentTable.contentType,
            status:      ContentTable.status,
            authorName:  ContentTable.authorName,
            updatedAt:   ContentTable.updatedAt,
          })
          .from(ContentTable)
          .orderBy(desc(ContentTable.updatedAt))
          .limit(5),

        // 5 most recent story submissions
        db
          .select({
            id:          StorySubmissionsTable.id,
            name:        StorySubmissionsTable.name,
            email:       StorySubmissionsTable.email,
            title:       StorySubmissionsTable.title,
            status:      StorySubmissionsTable.status,
            submittedAt: StorySubmissionsTable.submittedAt,
          })
          .from(StorySubmissionsTable)
          .orderBy(desc(StorySubmissionsTable.submittedAt))
          .limit(5),

        // 5 most recent unresolved contact messages
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

    return NextResponse.json({
      success: true,
      data: { newUsers, recentContent, recentStories, recentContacts },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/superadmin/recent-activity]", err);
    }
    return NextResponse.json(
      { success: false, error: "Failed to fetch recent activity" },
      { status: 500 }
    );
  }
}