import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const auctionSignups = pgTable("auction_signups", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  profession: text("profession").notNull(),
  level: integer("level").notNull(),
  round: integer("round").notNull(),
  column: integer("column").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auction = {
  ...auctionSignups,
};
