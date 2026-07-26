import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.ts";

/** A persisted squad group id. */
export const SquadGroupId = PositiveInt.pipe(
  Schema.brand("SquadGroupId")
).annotate({
  identifier: "SquadGroupId",
});
export type SquadGroupId = typeof SquadGroupId.Type;

/** Expected failure when a squad group id is invalid. */
export class InvalidSquadGroupId extends Schema.TaggedErrorClass<InvalidSquadGroupId>()(
  "InvalidSquadGroupId",
  {}
) {}

/** Parse a positive integer as a squad group id. */
export const parseSquadGroupId = Effect.fn("SquadGroupId.parse")(
  function* parseSquadGroupId(input: number) {
    return yield* Schema.decodeUnknownEffect(SquadGroupId)(input).pipe(
      Effect.catchTag("SchemaError", () => new InvalidSquadGroupId())
    );
  }
);
