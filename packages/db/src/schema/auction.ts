import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const auctionSignups = pgTable(
  "auction_signups",
  {
    column: integer("column").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    level: integer("level").notNull(),
    profession: text("profession").notNull(),
    round: integer("round").notNull(),
    type: text("type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => ({
    professionTypeIdx: index("profession_type_idx").on(
      table.profession,
      table.type
    ),
  })
);

export const auction = {
  ...auctionSignups,
};
