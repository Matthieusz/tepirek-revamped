import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const range = pgTable("range", {
	id: serial("id").primaryKey(),
	level: integer("level").notNull(),
	image: text("image"),
	name: text("name").notNull(),
});

export const skills = pgTable("skills", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	link: text("link").notNull(),
	mastery: boolean("mastery").notNull(),
	professionId: integer("profession_id")
		.references(() => professions.id)
		.notNull(),
	rangeId: integer("range_id")
		.references(() => range.id)
		.notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id)
		.notNull(),
});

export const professions = pgTable("professions", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
});
