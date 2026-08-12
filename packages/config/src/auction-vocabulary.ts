import * as Schema from "effect/Schema";

/** Auction types supported by the auction table. */
export const AUCTION_TYPES = ["main", "support"] as const;
export type AuctionType = (typeof AUCTION_TYPES)[number];

const AuctionTypeSchema = Schema.Literals(AUCTION_TYPES);
export const isAuctionType = Schema.is(AuctionTypeSchema);

/** Character professions supported by the auction table. */
export const AUCTION_PROFESSIONS = [
  "tracker",
  "paladin",
  "mage",
  "hunter",
  "blade-dancer",
  "warrior",
] as const;
export type AuctionProfession = (typeof AUCTION_PROFESSIONS)[number];

const AuctionProfessionSchema = Schema.Literals(AUCTION_PROFESSIONS);
export const isAuctionProfession = Schema.is(AuctionProfessionSchema);
