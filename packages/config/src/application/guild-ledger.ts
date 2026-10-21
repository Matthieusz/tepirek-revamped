/** Guild points awarded per hero bet, shared by ledger calculations and UI previews. */
export const POINTS_PER_HERO = 20;

/** Minimum guild earnings used by ranking and vault calculations. */
export const MIN_EARNINGS = 100_000_000;

/** Calculate guild points per hero-bet member, floored to two decimals. */
export const calculatePointsPerMember = (memberCount: number): number =>
  Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100;
