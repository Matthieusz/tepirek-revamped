import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.ts";

/** A persisted Margonem account access row id. */
export const MargonemAccountAccessId = PositiveInt.pipe(
  Schema.brand("MargonemAccountAccessId")
).annotate({
  identifier: "MargonemAccountAccessId",
});
export type MargonemAccountAccessId = typeof MargonemAccountAccessId.Type;

/** HTTP/API schema for a persisted Margonem account access row id. */
export const MargonemAccountAccessIdSchema = MargonemAccountAccessId;

/** Expected failure when an account access id is not a positive integer. */
export class InvalidMargonemAccountAccessId extends Schema.TaggedErrorClass<InvalidMargonemAccountAccessId>()(
  "InvalidMargonemAccountAccessId",
  {}
) {}

/** Parse a positive integer as a Margonem account access id. */
export const parseMargonemAccountAccessId = Effect.fn(
  "MargonemAccountAccessId.parse"
)(function* parseMargonemAccountAccessId(input: number) {
  return yield* Schema.decodeUnknownEffect(MargonemAccountAccessId)(input).pipe(
    Effect.catchTag("SchemaError", () => new InvalidMargonemAccountAccessId())
  );
});

/** Convert a Margonem account access id to its primitive representation. */
export const margonemAccountAccessIdToNumber = (
  id: MargonemAccountAccessId
): number => id;
