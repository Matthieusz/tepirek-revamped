import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { auth } from "./auth";

export const announcement = pgTable(
  "announcement",
  {
    createdAt: timestamp("created_at").notNull(),
    description: text("description").notNull(),
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => auth.user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("announcement_user_id_idx").on(table.userId),
    index("announcement_created_at_idx").on(table.createdAt),
  ]
);
