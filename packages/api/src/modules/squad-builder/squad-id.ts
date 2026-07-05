import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A persisted squad id. */
export const SquadId = PositiveInt.pipe(Schema.brand("SquadId")).annotate({
  identifier: "SquadId",
});
export type SquadId = typeof SquadId.Type;

/** Expected failure when a squad id is invalid. */
export interface InvalidSquadId {
  readonly _tag: "InvalidSquadId";
}

/** Parse a positive integer as a squad id. */
export const parseSquadId = Effect.fn("SquadId.parse")(function* parseSquadId(
  input: number
) {
  return yield* Schema.decodeUnknownEffect(SquadId)(input).pipe(
    Effect.catchTag("SchemaError", () =>
      Effect.fail({ _tag: "InvalidSquadId" } as const)
    )
  );
});
