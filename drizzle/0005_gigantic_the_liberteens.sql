ALTER TABLE "contact_submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "story_submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contact_submissions" CASCADE;--> statement-breakpoint
DROP TABLE "story_submissions" CASCADE;--> statement-breakpoint
DROP INDEX "content_slug_status_idx";--> statement-breakpoint
CREATE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");