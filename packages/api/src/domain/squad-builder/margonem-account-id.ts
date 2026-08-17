import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when an account id is not a positive integer. */
export class InvalidMargonemAccountId extends Schema.TaggedErrorClass<InvalidMargonemAccountId>()(
  "InvalidMargonemAccountId",
  {}
) {}

const brandedMargonemAccountId = makeBrandedPositiveInt(
  "MargonemAccountId",
  "MargonemAccountId.parse",
  () => new InvalidMargonemAccountId()
);

/** A persisted Margonem account row id. */
export const MargonemAccountId = brandedMargonemAccountId.schema;
export type MargonemAccountId = typeof MargonemAccountId.Type;

/** Parse a positive integer as a Margonem account id. */
export const parseMargonemAccountId = brandedMargonemAccountId.parse;
