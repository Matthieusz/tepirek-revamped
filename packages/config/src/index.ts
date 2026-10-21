/**
 * Frozen legacy application exports.
 * Import from application/<feature> instead; compiler configuration is separate.
 * Do not add exports here. See packages/config/README.md.
 */
export {
  MIN_EARNINGS,
  POINTS_PER_HERO,
  calculatePointsPerMember,
} from "./application/guild-ledger.ts";

export { USER_ROLES } from "./application/users.ts";

export {
  DEFAULT_EVENT_ICON_ID,
  EVENT_ICON_IDS,
  EVENT_ICON_OPTIONS,
  isEventIconId,
} from "./application/events.ts";

export type { EventIconId, EventIconOption } from "./application/events.ts";

export { slugifySkillRangeName } from "./slug.ts";

export {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  isAuctionProfession,
  isAuctionType,
  AUCTION_SLOT_COLUMNS,
  AUCTION_SLOT_LEVELS,
  AUCTION_SLOT_ROUND_LABELS,
  AUCTION_SLOT_ROUNDS,
  getAuctionSlotColumnCount,
  getAuctionSlotColumns,
  isLegalAuctionSlot,
} from "./application/auctions.ts";

export type {
  AuctionProfession,
  AuctionType,
  AuctionSlotCoordinate,
  AuctionSlotRound,
} from "./application/auctions.ts";
