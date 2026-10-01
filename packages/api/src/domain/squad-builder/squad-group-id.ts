import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad group id is invalid. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidSquadGroupId extends Schema.TaggedError<InvalidSquadGroupId>()(
  "InvalidSquadGroupId",
  {}
) {}

const brandedSquadGroupId = buildBrandedPositiveInt(
  "SquadGroupId",
  "SquadGroupId.parse",
  () => new InvalidSquadGroupId()
);

/** A persisted squad group id. */
export const SquadGroupId = brandedSquadGroupId.schema;

export type SquadGroupId = typeof SquadGroupId.Type;

/** Parse a positive integer as a squad group id. */
export const parseSquadGroupId = brandedSquadGroupId.parse;
