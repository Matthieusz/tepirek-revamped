import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad group invitation id is invalid. */
export class InvalidSquadGroupInvitationId extends Schema.TaggedErrorClass<InvalidSquadGroupInvitationId>()(
  "InvalidSquadGroupInvitationId",
  {}
) {}

const brandedSquadGroupInvitationId = makeBrandedPositiveInt(
  "SquadGroupInvitationId",
  "SquadGroupInvitationId.parse",
  () => new InvalidSquadGroupInvitationId()
);

/** A persisted squad group invitation id. */
export const SquadGroupInvitationId = brandedSquadGroupInvitationId.schema;
export type SquadGroupInvitationId = typeof SquadGroupInvitationId.Type;

/** Parse a positive integer as a squad group invitation id. */
export const parseSquadGroupInvitationId = brandedSquadGroupInvitationId.parse;
