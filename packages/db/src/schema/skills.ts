import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const range = pgTable("range", {
  id: serial("id").primaryKey(),
  image: text("image"),
  level: integer("level").notNull(),
  name: text("name").notNull(),
});

export const skills = pgTable(
  "skills",
  {
    id: serial("id").primaryKey(),
    link: text("link").notNull(),
    mastery: boolean("mastery").notNull(),
    name: text("name").notNull(),
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
  },
  (table) => [index("skills_range_id_idx").on(table.rangeId)]
);

export const professions = pgTable("professions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});
