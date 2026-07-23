import { POINTS_PER_HERO } from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";

const PointWorth = Schema.NullOr(
  Schema.Union([Schema.Finite, Schema.FiniteFromString])
);

/** Calculate points per member for a bet with given member count. */
export const calculatePointsPerMember = (memberCount: number): string =>
  (Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100).toFixed(2);

/** Parse an unknown point worth value without escaping Effect's error channel. */
export const parsePointWorth = (pointWorth: unknown) =>
  Schema.decodeUnknownEffect(PointWorth)(pointWorth);
