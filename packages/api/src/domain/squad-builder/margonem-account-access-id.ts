import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when an account access id is not a positive integer. */
export class InvalidMargonemAccountAccessId extends Schema.TaggedErrorClass<InvalidMargonemAccountAccessId>()(
  "InvalidMargonemAccountAccessId",
  {}
) {}

const brandedMargonemAccountAccessId = makeBrandedPositiveInt(
  "MargonemAccountAccessId",
  "MargonemAccountAccessId.parse",
  () => new InvalidMargonemAccountAccessId()
);

/** A persisted Margonem account access row id. */
export const MargonemAccountAccessId = brandedMargonemAccountAccessId.schema;
export type MargonemAccountAccessId = typeof MargonemAccountAccessId.Type;

/** Parse a positive integer as a Margonem account access id. */
export const parseMargonemAccountAccessId =
  brandedMargonemAccountAccessId.parse;
