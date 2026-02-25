import { boolean, index, pgTable, serial, text } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const todo = pgTable(
  "todo",
  {
    completed: boolean("completed").default(false).notNull(),
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [index("todo_user_id_idx").on(table.userId)]
);
