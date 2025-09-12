import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { auth } from "./auth";

export const announcement = pgTable("announcement", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => auth.user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull(),
});
