import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const event = pgTable("event", {
  active: boolean("active").default(true),
  color: text("color").notNull().default("#6366f1"),
  endTime: timestamp("end_time").notNull(),
  icon: text("icon").notNull().default("calendar"),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
