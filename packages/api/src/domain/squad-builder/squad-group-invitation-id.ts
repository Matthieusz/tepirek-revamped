import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A persisted squad group invitation id. */
export const SquadGroupInvitationId = PositiveInt.pipe(
  Schema.brand("SquadGroupInvitationId")
).annotate({
  identifier: "SquadGroupInvitationId",
});
export type SquadGroupInvitationId = typeof SquadGroupInvitationId.Type;

/** HTTP/API schema for a persisted squad group invitation id. */
export const SquadGroupInvitationIdSchema = SquadGroupInvitationId;

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

/** Convert a squad group invitation id to its primitive representation. */
export const squadGroupInvitationIdToNumber = (
  id: SquadGroupInvitationId
): number => id;
