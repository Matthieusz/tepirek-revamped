import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { event } from "./event";

export const hero = pgTable("hero", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	image: text("image"),
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
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	amount: integer("amount").notNull(),
	createdAt: timestamp("created_at").notNull(),
});

export const heroBetMember = pgTable("hero_bet_member", {
	id: serial("id").primaryKey(),
	heroBetId: integer("hero_bet_id")
		.notNull()
		.references(() => heroBet.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	points: integer("points").notNull(),
	createdAt: timestamp("created_at").notNull(),
});

export const userStats = pgTable("user_stats", {
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
	points: integer("points").notNull().default(0),
	bets: integer("bets").notNull().default(0),
	earnings: integer("earnings").notNull().default(0),
});

export const bet = {
	hero,
	heroBet,
	heroBetMember,
	userStats,
};
