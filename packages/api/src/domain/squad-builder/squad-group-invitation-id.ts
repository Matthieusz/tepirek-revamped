import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad group invitation id is invalid. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidSquadGroupInvitationId extends Schema.TaggedError<InvalidSquadGroupInvitationId>()(
  "InvalidSquadGroupInvitationId",
  {}
) {}

const brandedSquadGroupInvitationId = buildBrandedPositiveInt(
  "SquadGroupInvitationId",
  "SquadGroupInvitationId.parse",
  () => new InvalidSquadGroupInvitationId()
);

/** A persisted squad group invitation id. */
export const SquadGroupInvitationId = brandedSquadGroupInvitationId.schema;

export type SquadGroupInvitationId = typeof SquadGroupInvitationId.Type;

/** Parse a positive integer as a squad group invitation id. */
export const parseSquadGroupInvitationId = brandedSquadGroupInvitationId.parse;
