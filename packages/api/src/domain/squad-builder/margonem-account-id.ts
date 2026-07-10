import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A persisted Margonem account row id. */
export const MargonemAccountId = PositiveInt.pipe(
  Schema.brand("MargonemAccountId")
).annotate({
  identifier: "MargonemAccountId",
});
export type MargonemAccountId = typeof MargonemAccountId.Type;

/** HTTP/API schema for a persisted Margonem account row id. */
export const MargonemAccountIdSchema = MargonemAccountId;

/** Expected failure when an account id is not a positive integer. */
export class InvalidMargonemAccountId extends Schema.TaggedErrorClass<InvalidMargonemAccountId>()(
  "InvalidMargonemAccountId",
  {}
) {}

/** Parse a positive integer as a Margonem account id. */
export const parseMargonemAccountId = Effect.fn("MargonemAccountId.parse")(
  function* parseMargonemAccountId(input: number) {
    return yield* Schema.decodeUnknownEffect(MargonemAccountId)(input).pipe(
      Effect.catchTag("SchemaError", () => new InvalidMargonemAccountId())
    );
  }
);

/** Convert a Margonem account id to its primitive representation. */
export const margonemAccountIdToNumber = (id: MargonemAccountId): number => id;
