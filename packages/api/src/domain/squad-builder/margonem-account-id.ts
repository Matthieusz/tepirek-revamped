import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when an account id is not a positive integer. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidMargonemAccountId extends Schema.TaggedError<InvalidMargonemAccountId>()(
  "InvalidMargonemAccountId",
  {}
) {}

const brandedMargonemAccountId = buildBrandedPositiveInt(
  "MargonemAccountId",
  "MargonemAccountId.parse",
  () => new InvalidMargonemAccountId()
);

/** A persisted Margonem account row id. */
export const MargonemAccountId = brandedMargonemAccountId.schema;

export type MargonemAccountId = typeof MargonemAccountId.Type;

/** Parse a positive integer as a Margonem account id. */
export const parseMargonemAccountId = brandedMargonemAccountId.parse;
