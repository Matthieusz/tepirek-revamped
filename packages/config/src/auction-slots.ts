import type { AuctionProfession, AuctionType } from "./index.js";

/**
 * Auction slot rules shared by the API router and the web table.
 *
 * One source of truth for which Auction slot coordinates are legal:
 * profession, type, level, round, and column. Icon choices and page copy
 * stay in web modules; only slot vocabulary lives here.
 */

export const AUCTION_SLOT_LEVELS = Object.freeze(
  Array.from({ length: 28 }, (_, index) => 30 + index * 10)
) as readonly number[];

export const AUCTION_SLOT_ROUNDS = [1, 2, 3, 4] as const;
export type AuctionSlotRound = (typeof AUCTION_SLOT_ROUNDS)[number];

export const AUCTION_SLOT_ROUND_LABELS: Record<AuctionSlotRound, string> = {
  1: "Pierwsza",
  2: "Druga",
  3: "Trzecia",
  4: "Czwarta (SŁ)",
};

/**
 * Column labels per profession/type. The label count is the legal column
 * count for that slot; column numbers are 1..count.
 */
export const AUCTION_SLOT_COLUMNS: Record<
  AuctionProfession,
  Record<AuctionType, readonly string[]>
> = {
  "blade-dancer": {
    main: ["Fizyczna", "GR", "Trucizna"],
    support: ["Fizyczna", "GR", "Trucizna"],
  },
  hunter: {
    main: ["Fizyczna", "GR", "Trucizna"],
    support: ["Fizyczna", "Trucizna"],
  },
  mage: {
    main: ["Ogień", "Zimno", "Błyskawice"],
    support: ["Ogień", "Zimno", "Błyskawice"],
  },
  paladin: {
    main: ["Ogień", "Zimno", "Błyskawice"],
    support: ["Blok przebicia", "Bez bloku przebicia"],
  },
  tracker: {
    main: ["Ogień", "Zimno", "Błyskawice"],
    support: ["Ogień", "Zimno", "Błyskawice"],
  },
  warrior: {
    main: ["Fizyczna", "GR", "Dwureczna"],
    support: ["Blok przebicia", "Bez bloku przebicia"],
  },
};

export const getAuctionSlotColumns = (
  profession: AuctionProfession,
  type: AuctionType
): readonly string[] => AUCTION_SLOT_COLUMNS[profession][type];

export const getAuctionSlotColumnCount = (
  profession: AuctionProfession,
  type: AuctionType
): number => AUCTION_SLOT_COLUMNS[profession][type].length;

export interface AuctionSlotCoordinate {
  profession: AuctionProfession;
  type: AuctionType;
  level: number;
  round: number;
  column: number;
}

const isInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;

export const isLegalAuctionSlot = (
  coordinate: AuctionSlotCoordinate
): boolean => {
  if (
    !isInteger(coordinate.level) ||
    !isInteger(coordinate.round) ||
    !isInteger(coordinate.column)
  ) {
    return false;
  }

  if (!AUCTION_SLOT_LEVELS.includes(coordinate.level)) {
    return false;
  }

  if (!(AUCTION_SLOT_ROUNDS as readonly number[]).includes(coordinate.round)) {
    return false;
  }

  const columnCount = getAuctionSlotColumnCount(
    coordinate.profession,
    coordinate.type
  );

  return coordinate.column >= 1 && coordinate.column <= columnCount;
};
