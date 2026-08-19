-- Preview rows are short-lived confirmation tokens. Clear them before
-- removing the consumed-state columns so previously confirmed/applied rows
-- cannot become usable again under the new delete-on-consumption model.
DELETE FROM "margonem_account_import_previews";
--> statement-breakpoint
DELETE FROM "margonem_account_refetch_previews";
--> statement-breakpoint
DROP INDEX "margonem_import_previews_actor_status_idx";
--> statement-breakpoint
DROP INDEX "margonem_refetch_previews_actor_status_idx";
--> statement-breakpoint
ALTER TABLE "margonem_account_import_previews"
  DROP COLUMN "confirmed_at",
  DROP COLUMN "default_display_name",
  DROP COLUMN "firecrawl_credits_used",
  DROP COLUMN "suggested_account_name";
--> statement-breakpoint
ALTER TABLE "margonem_account_refetch_previews"
  DROP COLUMN "applied_at",
  DROP COLUMN "diff_json",
  DROP COLUMN "firecrawl_credits_used";
--> statement-breakpoint
CREATE INDEX "margonem_import_previews_actor_expires_idx"
  ON "margonem_account_import_previews" ("actor_user_id", "expires_at");
--> statement-breakpoint
CREATE INDEX "margonem_refetch_previews_actor_expires_idx"
  ON "margonem_account_refetch_previews" ("actor_user_id", "expires_at");