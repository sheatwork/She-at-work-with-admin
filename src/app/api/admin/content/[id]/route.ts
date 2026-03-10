// app/api/admin/content/[id]/route.ts
// SUPER_ADMIN + ADMIN: get, update, delete a single content item

import { db } from "@/db";
import { CategoriesTable, ContentTable, ContentTagsTable, TagsTable, UsersTable } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";


// ─── GET /api/admin/content/[id] ─────────────────────────────────────────────
export async function GET(_req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    // ✅ Fetch content + tags in parallel — avoids sequential waterfall
    const [contentRows, tagRows] = await Promise.all([
      db
        .select({
          id: ContentTable.id,
          title: ContentTable.title,
          slug: ContentTable.slug,
          summary: ContentTable.summary,
          content: ContentTable.content,
          contentType: ContentTable.contentType,
          status: ContentTable.status,
          featuredImage: ContentTable.featuredImage,
          externalUrl: ContentTable.externalUrl,
          readingTime: ContentTable.readingTime,
          publishedAt: ContentTable.publishedAt,
          authorName: ContentTable.authorName,
          createdAt: ContentTable.createdAt,
          updatedAt: ContentTable.updatedAt,
          categoryId: ContentTable.categoryId,
          categoryName: CategoriesTable.name,
          createdBy: ContentTable.createdBy,
          creatorName: UsersTable.name,
        })
        .from(ContentTable)
        .leftJoin(CategoriesTable, eq(ContentTable.categoryId, CategoriesTable.id))
        .leftJoin(UsersTable, eq(ContentTable.createdBy, UsersTable.id))
        .where(eq(ContentTable.id, id))
        .limit(1),
      db
        .select({ id: TagsTable.id, name: TagsTable.name, slug: TagsTable.slug })
        .from(ContentTagsTable)
        .innerJoin(TagsTable, eq(ContentTagsTable.tagId, TagsTable.id))
        .where(eq(ContentTagsTable.contentId, id)),
    ]);

    if (!contentRows[0]) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...contentRows[0], tags: tagRows },
    });
  } catch (err) {
    console.error("[GET /admin/content/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch content" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/content/[id] ───────────────────────────────────────────
// Partial update — only provided fields are changed
export async function PATCH(req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const {
      title, content, summary, categoryId, authorName,
      featuredImage, externalUrl, status, publishedAt, readingTime,
      tags, // Add tags
    } = body;

    // Use transaction for updates
    const result = await db.transaction(async (tx) => {
      // Update content
      const updates: Partial<typeof ContentTable.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (title !== undefined) updates.title = title.trim();
      if (content !== undefined) updates.content = content;
      if (summary !== undefined) updates.summary = summary?.trim() ?? null;
      if (categoryId !== undefined) updates.categoryId = categoryId;
      if (authorName !== undefined) updates.authorName = authorName?.trim() ?? null;
      if (featuredImage !== undefined) updates.featuredImage = featuredImage;
      if (externalUrl !== undefined) updates.externalUrl = externalUrl;
      if (readingTime !== undefined) updates.readingTime = readingTime;
      if (status !== undefined) {
        updates.status = status;
        if (status === "PUBLISHED" && !publishedAt) {
          updates.publishedAt = new Date();
        }
      }
      if (publishedAt !== undefined) updates.publishedAt = new Date(publishedAt);

      const [updated] = await tx
        .update(ContentTable)
        .set(updates)
        .where(eq(ContentTable.id, id))
        .returning();

      if (!updated) {
        throw new Error("Content not found");
      }

      // Update tags if provided
      if (tags !== undefined) {
        // Get current tags
        const currentTags = await tx
          .select({ tagId: ContentTagsTable.tagId })
          .from(ContentTagsTable)
          .where(eq(ContentTagsTable.contentId, id));

        const currentTagIds = currentTags.map(t => t.tagId);

        // Tags to add (in new but not in current)
        const tagsToAdd = tags.filter((tagId: string) => !currentTagIds.includes(tagId));

        // Tags to remove (in current but not in new)
        const tagsToRemove = currentTagIds.filter((tagId: string) => !tags.includes(tagId));

        // Add new tags
        if (tagsToAdd.length > 0) {
          await tx.insert(ContentTagsTable).values(
            tagsToAdd.map((tagId: string) => ({
              contentId: id,
              tagId: tagId,
            }))
          );

          // Increment usage count
          for (const tagId of tagsToAdd) {
            await tx
              .update(TagsTable)
              .set({ usageCount: sql`${TagsTable.usageCount} + 1` })
              .where(eq(TagsTable.id, tagId));
          }
        }

        // Remove old tags
        if (tagsToRemove.length > 0) {
          await tx
            .delete(ContentTagsTable)
            .where(
              and(
                eq(ContentTagsTable.contentId, id),
                inArray(ContentTagsTable.tagId, tagsToRemove)
              )
            );

          // Decrement usage count
          for (const tagId of tagsToRemove) {
            await tx
              .update(TagsTable)
              .set({ usageCount: sql`${TagsTable.usageCount} - 1` })
              .where(eq(TagsTable.id, tagId));
          }
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[PATCH /admin/content/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to update content" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/content/[id] ──────────────────────────────────────────
// Hard delete — cascades to content_tags via DB constraint
export async function DELETE(_req: NextRequest,  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const [deleted] = await db
      .delete(ContentTable)
      .where(eq(ContentTable.id, id))
      .returning({ id: ContentTable.id });

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Content deleted" });
  } catch (err) {
    console.error("[DELETE /admin/content/:id]", err);
    return NextResponse.json({ success: false, error: "Failed to delete content" }, { status: 500 });
  }
}