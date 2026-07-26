import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.ts";

/** A persisted squad group invitation id. */
export const SquadGroupInvitationId = PositiveInt.pipe(
  Schema.brand("SquadGroupInvitationId")
).annotate({
  identifier: "SquadGroupInvitationId",
});
export type SquadGroupInvitationId = typeof SquadGroupInvitationId.Type;

/** Expected failure when a squad group invitation id is invalid. */
export class InvalidSquadGroupInvitationId extends Schema.TaggedErrorClass<InvalidSquadGroupInvitationId>()(
  "InvalidSquadGroupInvitationId",
  {}
) {}

/** Parse a positive integer as a squad group invitation id. */
export const parseSquadGroupInvitationId = Effect.fn(
  "SquadGroupInvitationId.parse"
)(function* parseSquadGroupInvitationId(input: number) {
  return yield* Schema.decodeUnknownEffect(SquadGroupInvitationId)(input).pipe(
    Effect.catchTag("SchemaError", () => new InvalidSquadGroupInvitationId())
  );
});
