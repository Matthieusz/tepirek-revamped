CREATE TYPE "legendary_enemy_category" AS ENUM('hero', 'elite2');--> statement-breakpoint
CREATE TYPE "legendary_equipment_type" AS ENUM('weapon', 'orb', 'armor', 'helmet', 'boots', 'gloves', 'ring', 'necklace', 'shield');--> statement-breakpoint
CREATE TYPE "legendary_profession" AS ENUM('warrior', 'paladin', 'bladeDancer', 'mage', 'hunter', 'tracker');--> statement-breakpoint
CREATE TABLE "legendary_enemies" (
	"active" boolean DEFAULT true NOT NULL,
	"category" "legendary_enemy_category" NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"icon_url" text,
	"id" serial PRIMARY KEY,
	"last_seen_at" timestamp NOT NULL,
	"level" integer NOT NULL,
	"margoworld_npc_id" bigint NOT NULL,
	"name" text NOT NULL,
	"source_url" text NOT NULL,
	CONSTRAINT "legendary_enemies_level_positive" CHECK ("level" >= 1),
	CONSTRAINT "legendary_enemies_margoworld_npc_id_safe" CHECK ("margoworld_npc_id" between 1 and 9007199254740991),
	CONSTRAINT "legendary_enemies_name_not_empty" CHECK (length(btrim("name")) >= 1),
	CONSTRAINT "legendary_enemies_source_url_not_empty" CHECK (length(btrim("source_url")) >= 1)
);
--> statement-breakpoint
CREATE TABLE "legendary_items" (
	"active" boolean DEFAULT true NOT NULL,
	"equipment_type" "legendary_equipment_type" NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"icon_url" text NOT NULL,
	"id" serial PRIMARY KEY,
	"last_seen_at" timestamp NOT NULL,
	"legendary_bonus" text NOT NULL,
	"level" integer NOT NULL,
	"margoworld_item_id" bigint NOT NULL,
	"name" text NOT NULL,
	"professions" "legendary_profession"[] NOT NULL,
	CONSTRAINT "legendary_items_level_positive" CHECK ("level" >= 1),
	CONSTRAINT "legendary_items_margoworld_item_id_safe" CHECK ("margoworld_item_id" between 1 and 9007199254740991),
	CONSTRAINT "legendary_items_name_not_empty" CHECK (length(btrim("name")) >= 1),
	CONSTRAINT "legendary_items_icon_url_not_empty" CHECK (length(btrim("icon_url")) >= 1),
	CONSTRAINT "legendary_items_bonus_not_empty" CHECK (length(btrim("legendary_bonus")) >= 1)
);
--> statement-breakpoint
CREATE TABLE "legendary_item_costs" (
	"item_id" integer PRIMARY KEY,
	"price_gold" bigint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "legendary_item_costs_price_gold_safe" CHECK ("price_gold" between 0 and 9007199254740991),
	CONSTRAINT "legendary_item_costs_version_positive" CHECK ("version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "legendary_item_drops" (
	"enemy_id" integer,
	"item_id" integer,
	CONSTRAINT "legendary_item_drops_item_enemy_pk" PRIMARY KEY("item_id","enemy_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "legendary_enemies_margoworld_npc_id_unique" ON "legendary_enemies" ("margoworld_npc_id");--> statement-breakpoint
CREATE INDEX "legendary_enemies_category_active_level_idx" ON "legendary_enemies" ("category","active","level");--> statement-breakpoint
CREATE INDEX "legendary_enemies_name_idx" ON "legendary_enemies" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "legendary_items_margoworld_item_id_unique" ON "legendary_items" ("margoworld_item_id");--> statement-breakpoint
CREATE INDEX "legendary_items_active_level_idx" ON "legendary_items" ("active","level");--> statement-breakpoint
CREATE INDEX "legendary_items_name_idx" ON "legendary_items" ("name");--> statement-breakpoint
CREATE INDEX "legendary_items_equipment_type_idx" ON "legendary_items" ("equipment_type");--> statement-breakpoint
CREATE INDEX "legendary_items_professions_idx" ON "legendary_items" USING gin ("professions");--> statement-breakpoint
CREATE INDEX "legendary_item_drops_enemy_id_idx" ON "legendary_item_drops" ("enemy_id");--> statement-breakpoint
ALTER TABLE "legendary_item_costs" ADD CONSTRAINT "legendary_item_costs_item_id_legendary_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "legendary_items"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "legendary_item_costs" ADD CONSTRAINT "legendary_item_costs_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "legendary_item_drops" ADD CONSTRAINT "legendary_item_drops_enemy_id_legendary_enemies_id_fkey" FOREIGN KEY ("enemy_id") REFERENCES "legendary_enemies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "legendary_item_drops" ADD CONSTRAINT "legendary_item_drops_item_id_legendary_items_id_fkey" FOREIGN KEY ("item_id") REFERENCES "legendary_items"("id") ON DELETE CASCADE;
