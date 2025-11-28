import {
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

export const hero = pgTable("hero", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image"),
  level: integer("level").notNull().default(1),
  pointWorth: integer("point_worth").notNull().default(0),
  eventId: integer("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
});

export const heroBet = pgTable("hero_bet", {
  id: serial("id").primaryKey(),
  heroId: integer("hero_id")
    .notNull()
    .references(() => hero.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  memberCount: integer("member_count").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const heroBetMember = pgTable(
  "hero_bet_member",
  {
    id: serial("id").primaryKey(),
    heroBetId: integer("hero_bet_id")
      .notNull()
      .references(() => heroBet.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    points: numeric("points", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [unique().on(table.heroBetId, table.userId)]
);

export const userStats = pgTable(
  "user_stats",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    heroId: integer("hero_id")
      .notNull()
      .references(() => hero.id, { onDelete: "cascade" }),
    points: numeric("points", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    bets: integer("bets").notNull().default(0),
    earnings: numeric("earnings", { precision: 20, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [unique().on(table.userId, table.eventId, table.heroId)]
);

export const bet = {
  hero,
  heroBet,
  heroBetMember,
  userStats,
};
