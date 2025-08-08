import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const range = pgTable("range", {
	id: serial("id").primaryKey(),
	level: integer("level").notNull(),
	image: text("image"),
	name: text("name").notNull(),
});

export const skills = pgTable("skills", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	professionId: integer("profession_id")
		.references(() => professions.id)
		.notNull(),
	rangeId: integer("range_id")
		.references(() => range.id)
		.notNull(),
});

export const professions = pgTable("professions", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
});
