DROP INDEX "content_created_by_idx";--> statement-breakpoint
DROP INDEX "content_type_status_idx";--> statement-breakpoint
CREATE INDEX "content_type_status_published_idx" ON "content" USING btree ("content_type","status","published_at");