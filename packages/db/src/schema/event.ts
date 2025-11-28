import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const event = pgTable("event", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("calendar"),
  color: text("color").notNull().default("#6366f1"),
  active: boolean("active").default(true),
  endTime: timestamp("end_time").notNull(),
});
