import { POINTS_PER_HERO } from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";

const PointWorth = Schema.NullOr(
  Schema.Union([Schema.Number, Schema.NumberFromString])
);

/** Calculate points per member for a bet with given member count. */
export const calculatePointsPerMember = (memberCount: number): string =>
  (Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100).toFixed(2);

/** Parse a point worth value (number, string, or null) to number or null. */
export const parsePointWorth = (
  pointWorth: number | string | null
): number | null => Schema.decodeUnknownSync(PointWorth)(pointWorth);
