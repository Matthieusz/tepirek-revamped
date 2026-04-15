export const POINTS_PER_HERO = 20;
export const MIN_EARNINGS = 100_000_000;

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

export const isEventIconId = (value: string): value is EventIconId =>
  EVENT_ICON_IDS.some((eventIconId) => eventIconId === value);

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

export const isAuctionType = (value: string): value is AuctionType =>
  AUCTION_TYPES.some((auctionType) => auctionType === value);

export const AUCTION_PROFESSIONS = [
  "tracker",
  "paladin",
  "mage",
  "hunter",
  "blade-dancer",
  "warrior",
] as const;
export type AuctionProfession = (typeof AUCTION_PROFESSIONS)[number];

export const isAuctionProfession = (
  value: string
): value is AuctionProfession =>
  AUCTION_PROFESSIONS.some((auctionProfession) => auctionProfession === value);
