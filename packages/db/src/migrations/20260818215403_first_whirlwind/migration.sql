CREATE TYPE "legendary_catalog_sync_status" AS ENUM('succeeded', 'failed');--> statement-breakpoint
ALTER TYPE "legendary_equipment_type" ADD VALUE 'talisman';--> statement-breakpoint
ALTER TYPE "legendary_equipment_type" ADD VALUE 'ammunition';--> statement-breakpoint
CREATE TABLE "legendary_catalog_sync_runs" (
	"activated_enemy_count" integer DEFAULT 0 NOT NULL,
	"activated_item_count" integer DEFAULT 0 NOT NULL,
	"deactivated_enemy_count" integer DEFAULT 0 NOT NULL,
	"deactivated_item_count" integer DEFAULT 0 NOT NULL,
	"enemy_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_tag" text,
	"finished_at" timestamp NOT NULL,
	"id" serial PRIMARY KEY,
	"item_count" integer DEFAULT 0 NOT NULL,
	"source_posts" jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"status" "legendary_catalog_sync_status" NOT NULL,
	CONSTRAINT "legendary_catalog_sync_runs_counts_non_negative" CHECK ("enemy_count" >= 0 and "item_count" >= 0 and "activated_enemy_count" >= 0 and "activated_item_count" >= 0 and "deactivated_enemy_count" >= 0 and "deactivated_item_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "legendary_enemies" DROP CONSTRAINT "legendary_enemies_margoworld_npc_id_safe";--> statement-breakpoint
ALTER TABLE "legendary_items" DROP CONSTRAINT "legendary_items_margoworld_item_id_safe";--> statement-breakpoint
DROP INDEX "legendary_enemies_margoworld_npc_id_unique";--> statement-breakpoint
DROP INDEX "legendary_items_margoworld_item_id_unique";--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD COLUMN "profession" "legendary_profession";--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD COLUMN "source_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD COLUMN "source_icon_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD COLUMN "source_post_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_items" ADD COLUMN "source_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_items" ADD COLUMN "source_icon_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_enemies" DROP COLUMN "margoworld_npc_id";--> statement-breakpoint
ALTER TABLE "legendary_items" DROP COLUMN "margoworld_item_id";--> statement-breakpoint
ALTER TABLE "legendary_enemies" ALTER COLUMN "icon_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "legendary_items" ALTER COLUMN "legendary_bonus" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "legendary_catalog_sync_runs_status_finished_at_idx" ON "legendary_catalog_sync_runs" ("status","finished_at");--> statement-breakpoint
CREATE UNIQUE INDEX "legendary_enemies_category_source_icon_key_unique" ON "legendary_enemies" ("category","source_icon_key");--> statement-breakpoint
CREATE UNIQUE INDEX "legendary_items_source_icon_key_unique" ON "legendary_items" ("source_icon_key");--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD CONSTRAINT "legendary_enemies_source_post_id_safe" CHECK ("source_post_id" between 1 and 9007199254740991);--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD CONSTRAINT "legendary_enemies_source_icon_key_valid" CHECK ("source_icon_key" like '/obrazki/npc/%');--> statement-breakpoint
ALTER TABLE "legendary_enemies" ADD CONSTRAINT "legendary_enemies_fingerprint_not_empty" CHECK (length(btrim("source_fingerprint")) >= 1);--> statement-breakpoint
ALTER TABLE "legendary_items" ADD CONSTRAINT "legendary_items_source_icon_key_valid" CHECK ("source_icon_key" like '/obrazki/itemy/%');--> statement-breakpoint
ALTER TABLE "legendary_items" ADD CONSTRAINT "legendary_items_fingerprint_not_empty" CHECK (length(btrim("source_fingerprint")) >= 1);--> statement-breakpoint
ALTER TABLE "legendary_items" DROP CONSTRAINT "legendary_items_bonus_not_empty", ADD CONSTRAINT "legendary_items_bonus_not_empty" CHECK ("legendary_bonus" is null or length(btrim("legendary_bonus")) >= 1);