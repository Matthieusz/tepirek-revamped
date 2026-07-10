import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A persisted squad id. */
export const SquadId = PositiveInt.pipe(Schema.brand("SquadId")).annotate({
  identifier: "SquadId",
});
export type SquadId = typeof SquadId.Type;

/** HTTP/API schema for a persisted squad id. */
export const SquadIdSchema = SquadId;

/** Expected failure when a squad id is invalid. */
export class InvalidSquadId extends Schema.TaggedErrorClass<InvalidSquadId>()(
  "InvalidSquadId",
  {}
) {}

/** Parse a positive integer as a squad id. */
export const parseSquadId = Effect.fn("SquadId.parse")(function* parseSquadId(
  input: number
) {
  return yield* Schema.decodeUnknownEffect(SquadId)(input).pipe(
    Effect.catchTag("SchemaError", () => new InvalidSquadId())
  );
});
