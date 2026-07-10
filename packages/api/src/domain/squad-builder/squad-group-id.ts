import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A persisted squad group id. */
export const SquadGroupId = PositiveInt.pipe(
  Schema.brand("SquadGroupId")
).annotate({
  identifier: "SquadGroupId",
});
export type SquadGroupId = typeof SquadGroupId.Type;

/** HTTP/API schema for a persisted squad group id. */
export const SquadGroupIdSchema = SquadGroupId;

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

/** Convert a squad group id to its primitive representation. */
export const squadGroupIdToNumber = (id: SquadGroupId): number => id;
