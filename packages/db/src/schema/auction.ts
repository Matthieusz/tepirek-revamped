import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const auction = pgTable(
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
    auctionSlotUniqueIdx: uniqueIndex("auction_slot_unique_idx").on(
      table.profession,
      table.type,
      table.level,
      table.round,
      table.column
    ),
    professionTypeIdx: index("profession_type_idx").on(
      table.profession,
      table.type
    ),
  })
);
