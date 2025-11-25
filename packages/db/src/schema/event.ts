import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const event = pgTable("event", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true),
  endTime: timestamp("end_time").notNull(),
});
