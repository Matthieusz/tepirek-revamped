/** Shared auction vocabulary; presentation choices remain in the web feature. */
export {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  isAuctionProfession,
  isAuctionType,
} from "../auction-vocabulary.ts";

export type { AuctionProfession, AuctionType } from "../auction-vocabulary.ts";

/** Shared slot layout and legality rules for the API and auction table. */
export {
  AUCTION_SLOT_COLUMNS,
  AUCTION_SLOT_LEVELS,
  AUCTION_SLOT_ROUND_LABELS,
  AUCTION_SLOT_ROUNDS,
  getAuctionSlotColumnCount,
  getAuctionSlotColumns,
  isLegalAuctionSlot,
} from "../auction-slots.ts";

export type {
  AuctionSlotCoordinate,
  AuctionSlotRound,
} from "../auction-slots.ts";
