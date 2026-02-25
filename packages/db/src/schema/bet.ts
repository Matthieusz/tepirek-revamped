import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { event } from "./event";

export const hero = pgTable(
  "hero",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    image: text("image"),
    level: integer("level").notNull().default(1),
    name: text("name").notNull(),
    pointWorth: integer("point_worth").notNull().default(0),
  },
  (table) => [index("hero_event_id_idx").on(table.eventId)]
);

export const heroBet = pgTable(
  "hero_bet",
  {
    createdAt: timestamp("created_at").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    heroId: integer("hero_id")
      .notNull()
      .references(() => hero.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    memberCount: integer("member_count").notNull(),
  },
  (table) => [
    index("hero_bet_hero_id_idx").on(table.heroId),
    index("hero_bet_created_at_idx").on(table.createdAt),
  ]
);

export const heroBetMember = pgTable(
  "hero_bet_member",
  {
    heroBetId: integer("hero_bet_id")
      .notNull()
      .references(() => heroBet.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    points: numeric("points", { precision: 10, scale: 2 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique().on(table.heroBetId, table.userId),
    index("hero_bet_member_bet_id_idx").on(table.heroBetId),
  ]
);

export const userStats = pgTable(
  "user_stats",
  {
    bets: integer("bets").notNull().default(0),
    earnings: numeric("earnings", { precision: 20, scale: 2 })
      .notNull()
      .default("0"),
    eventId: integer("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    heroId: integer("hero_id")
      .notNull()
      .references(() => hero.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    paidOut: boolean("paid_out").notNull().default(false),
    points: numeric("points", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique().on(table.userId, table.eventId, table.heroId),
    index("user_stats_event_id_idx").on(table.eventId),
    index("user_stats_hero_id_idx").on(table.heroId),
    index("user_stats_paid_out_event_idx").on(table.paidOut, table.eventId),
  ]
);

export const bet = {
  hero,
  heroBet,
  heroBetMember,
  userStats,
};
