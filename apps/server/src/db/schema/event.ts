import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const event = pgTable("event", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	endTime: timestamp("end_time").notNull(),
});
