import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth.ts";

/** PostgreSQL enum for supported current forum enemy categories. */
export const legendaryEnemyCategory = pgEnum("legendary_enemy_category", [
  "hero",
  "elite2",
]);

/** PostgreSQL enum for supported legendary equipment slots. */
export const legendaryEquipmentType = pgEnum("legendary_equipment_type", [
  "weapon",
  "orb",
  "armor",
  "helmet",
  "boots",
  "gloves",
  "ring",
  "necklace",
  "shield",
]);

/** PostgreSQL enum for professions used by enemies and equipment requirements. */
export const legendaryProfession = pgEnum("legendary_profession", [
  "warrior",
  "paladin",
  "bladeDancer",
  "mage",
  "hunter",
  "tracker",
]);

/** PostgreSQL status of one catalog synchronization attempt. */
export const legendaryCatalogSyncStatus = pgEnum(
  "legendary_catalog_sync_status",
  ["succeeded", "failed"]
);

/** Synced legendary equipment metadata, independent from administrator prices. */
export const legendaryItem = pgTable(
  "legendary_items",
  {
    active: boolean("active").default(true).notNull(),
    equipmentType: legendaryEquipmentType("equipment_type").notNull(),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    iconUrl: text("icon_url").notNull(),
    id: serial("id").primaryKey(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    legendaryBonus: text("legendary_bonus"),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    professions: legendaryProfession("professions").array().notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    sourceIconKey: text("source_icon_key").notNull(),
  },
  (table) => [
    uniqueIndex("legendary_items_source_icon_key_unique").on(
      table.sourceIconKey
    ),
    index("legendary_items_active_level_idx").on(table.active, table.level),
    index("legendary_items_name_idx").on(table.name),
    index("legendary_items_equipment_type_idx").on(table.equipmentType),
    index("legendary_items_professions_idx").using("gin", table.professions),
    check("legendary_items_level_positive", sql`${table.level} >= 1`),
    check(
      "legendary_items_source_icon_key_valid",
      sql`${table.sourceIconKey} like '/obrazki/itemy/%'`
    ),
    check(
      "legendary_items_name_not_empty",
      sql`length(btrim(${table.name})) >= 1`
    ),
    check(
      "legendary_items_icon_url_not_empty",
      sql`length(btrim(${table.iconUrl})) >= 1`
    ),
    check(
      "legendary_items_fingerprint_not_empty",
      sql`length(btrim(${table.sourceFingerprint})) >= 1`
    ),
    check(
      "legendary_items_bonus_not_empty",
      sql`${table.legendaryBonus} is null or length(btrim(${table.legendaryBonus})) >= 1`
    ),
  ]
);

/** Current and previously observed heroes and Elite II enemies. */
export const legendaryEnemy = pgTable(
  "legendary_enemies",
  {
    active: boolean("active").default(true).notNull(),
    category: legendaryEnemyCategory("category").notNull(),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    iconUrl: text("icon_url").notNull(),
    id: serial("id").primaryKey(),
    lastSeenAt: timestamp("last_seen_at").notNull(),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    profession: legendaryProfession("profession"),
    sourceFingerprint: text("source_fingerprint").notNull(),
    sourceIconKey: text("source_icon_key").notNull(),
    sourcePostId: bigint("source_post_id", { mode: "number" }).notNull(),
    sourceUrl: text("source_url").notNull(),
  },
  (table) => [
    uniqueIndex("legendary_enemies_category_source_icon_key_unique").on(
      table.category,
      table.sourceIconKey
    ),
    index("legendary_enemies_category_active_level_idx").on(
      table.category,
      table.active,
      table.level
    ),
    index("legendary_enemies_name_idx").on(table.name),
    check("legendary_enemies_level_positive", sql`${table.level} >= 1`),
    check(
      "legendary_enemies_source_post_id_safe",
      sql`${table.sourcePostId} between 1 and ${Number.MAX_SAFE_INTEGER}`
    ),
    check(
      "legendary_enemies_source_icon_key_valid",
      sql`${table.sourceIconKey} like '/obrazki/npc/%'`
    ),
    check(
      "legendary_enemies_name_not_empty",
      sql`length(btrim(${table.name})) >= 1`
    ),
    check(
      "legendary_enemies_source_url_not_empty",
      sql`length(btrim(${table.sourceUrl})) >= 1`
    ),
    check(
      "legendary_enemies_fingerprint_not_empty",
      sql`length(btrim(${table.sourceFingerprint})) >= 1`
    ),
  ]
);

/** Unique item-to-enemy drop relationships from complete catalog syncs. */
export const legendaryItemDrop = pgTable(
  "legendary_item_drops",
  {
    enemyId: integer("enemy_id")
      .references(() => legendaryEnemy.id, { onDelete: "cascade" })
      .notNull(),
    itemId: integer("item_id")
      .references(() => legendaryItem.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.itemId, table.enemyId],
      name: "legendary_item_drops_item_enemy_pk",
    }),
    index("legendary_item_drops_enemy_id_idx").on(table.enemyId),
  ]
);

/** Administrator-managed whole-gold prices with optimistic versions. */
export const legendaryItemCost = pgTable(
  "legendary_item_costs",
  {
    itemId: integer("item_id")
      .primaryKey()
      .references(() => legendaryItem.id, { onDelete: "cascade" }),
    priceGold: bigint("price_gold", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    updatedBy: text("updated_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [
    check(
      "legendary_item_costs_price_gold_safe",
      sql`${table.priceGold} between 0 and ${Number.MAX_SAFE_INTEGER}`
    ),
    check("legendary_item_costs_version_positive", sql`${table.version} >= 1`),
  ]
);

/** Diagnostic summary of a catalog synchronization attempt. */
export const legendaryCatalogSyncRun = pgTable(
  "legendary_catalog_sync_runs",
  {
    activatedEnemyCount: integer("activated_enemy_count").default(0).notNull(),
    activatedItemCount: integer("activated_item_count").default(0).notNull(),
    deactivatedEnemyCount: integer("deactivated_enemy_count")
      .default(0)
      .notNull(),
    deactivatedItemCount: integer("deactivated_item_count")
      .default(0)
      .notNull(),
    enemyCount: integer("enemy_count").default(0).notNull(),
    errorMessage: text("error_message"),
    errorTag: text("error_tag"),
    finishedAt: timestamp("finished_at").notNull(),
    id: serial("id").primaryKey(),
    itemCount: integer("item_count").default(0).notNull(),
    sourcePosts: jsonb("source_posts").notNull(),
    startedAt: timestamp("started_at").notNull(),
    status: legendaryCatalogSyncStatus("status").notNull(),
  },
  (table) => [
    index("legendary_catalog_sync_runs_status_finished_at_idx").on(
      table.status,
      table.finishedAt
    ),
    check(
      "legendary_catalog_sync_runs_counts_non_negative",
      sql`${table.enemyCount} >= 0 and ${table.itemCount} >= 0 and ${table.activatedEnemyCount} >= 0 and ${table.activatedItemCount} >= 0 and ${table.deactivatedEnemyCount} >= 0 and ${table.deactivatedItemCount} >= 0`
    ),
  ]
);

/** Tables that make up legend-pricing persistence. */
export const legendPricing = {
  legendaryCatalogSyncRun,
  legendaryEnemy,
  legendaryItem,
  legendaryItemCost,
  legendaryItemDrop,
};
