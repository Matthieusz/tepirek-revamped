import * as Schema from "effect/Schema";

const PointWorth = Schema.NullOr(
  Schema.Union([Schema.Finite, Schema.FiniteFromString])
);

/** Parse an unknown point worth value without escaping Effect's error channel. */
export const parsePointWorth = Schema.decodeUnknownEffect(PointWorth);
