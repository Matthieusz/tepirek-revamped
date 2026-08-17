import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad group id is invalid. */
export class InvalidSquadGroupId extends Schema.TaggedErrorClass<InvalidSquadGroupId>()(
  "InvalidSquadGroupId",
  {}
) {}

const brandedSquadGroupId = makeBrandedPositiveInt(
  "SquadGroupId",
  "SquadGroupId.parse",
  () => new InvalidSquadGroupId()
);

/** A persisted squad group id. */
export const SquadGroupId = brandedSquadGroupId.schema;
export type SquadGroupId = typeof SquadGroupId.Type;

/** Parse a positive integer as a squad group id. */
export const parseSquadGroupId = brandedSquadGroupId.parse;
