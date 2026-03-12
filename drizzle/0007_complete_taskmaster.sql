DROP INDEX "tags_usage_count_idx";--> statement-breakpoint
CREATE INDEX "categories_content_type_active_idx" ON "categories" USING btree ("content_type","is_active");--> statement-breakpoint
CREATE INDEX "contact_submissions_resolved_submitted_idx" ON "contact_submissions" USING btree ("is_resolved","submitted_at");--> statement-breakpoint
CREATE INDEX "content_created_at_desc_idx" ON "content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "content_created_by_idx" ON "content" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "content_type_status_created_idx" ON "content" USING btree ("content_type","status","created_at");--> statement-breakpoint
CREATE INDEX "resources_scope_location_active_idx" ON "resources" USING btree ("scope","location_key","is_active");--> statement-breakpoint
CREATE INDEX "story_submissions_status_submitted_idx" ON "story_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "tags_usage_count_desc_idx" ON "tags" USING btree ("usage_count");