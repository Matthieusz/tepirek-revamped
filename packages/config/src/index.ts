import * as Schema from "effect/Schema";

export const POINTS_PER_HERO = 20;
export const MIN_EARNINGS = 100_000_000;

export { slugifySkillRangeName } from "./slug.ts";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Event icons
// ---------------------------------------------------------------------------

export const EVENT_ICON_IDS = [
  "egg",
  "sun",
  "ghost",
  "cake",
  "snowflake",
  "calendar",
] as const;

export type EventIconId = (typeof EVENT_ICON_IDS)[number];

const EventIconIdSchema = Schema.Literals(EVENT_ICON_IDS);
export const isEventIconId = Schema.is(EventIconIdSchema);

export interface EventIconOption {
  id: EventIconId;
  name: string;
}

export const EVENT_ICON_OPTIONS: readonly EventIconOption[] = [
  { id: "egg", name: "Wielkanoc" },
  { id: "sun", name: "Wakacje" },
  { id: "ghost", name: "Halloween" },
  { id: "cake", name: "Urodziny" },
  { id: "snowflake", name: "Gwiazdka" },
  { id: "calendar", name: "Inne" },
] as const;

export const DEFAULT_EVENT_ICON_ID: EventIconId = "calendar";

// ---------------------------------------------------------------------------
// Auction types & professions
// ---------------------------------------------------------------------------

export const AUCTION_TYPES = ["main", "support"] as const;
export type AuctionType = (typeof AUCTION_TYPES)[number];

const AuctionTypeSchema = Schema.Literals(AUCTION_TYPES);
export const isAuctionType = Schema.is(AuctionTypeSchema);

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

// ---------------------------------------------------------------------------
// Auction slot rules (levels, rounds, columns, legality)
// ---------------------------------------------------------------------------

export {
  AUCTION_SLOT_COLUMNS,
  AUCTION_SLOT_LEVELS,
  AUCTION_SLOT_ROUND_LABELS,
  AUCTION_SLOT_ROUNDS,
  getAuctionSlotColumnCount,
  getAuctionSlotColumns,
  isLegalAuctionSlot,
} from "./auction-slots.ts";
export type {
  AuctionSlotCoordinate,
  AuctionSlotRound,
} from "./auction-slots.ts";
