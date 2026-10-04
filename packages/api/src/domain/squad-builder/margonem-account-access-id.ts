import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when an account access id is not a positive integer. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidMargonemAccountAccessId extends Schema.TaggedError<InvalidMargonemAccountAccessId>()(
  "InvalidMargonemAccountAccessId",
  {}
) {}

const brandedMargonemAccountAccessId = buildBrandedPositiveInt(
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
