import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad id is invalid. */
export class InvalidSquadId extends Schema.TaggedErrorClass<InvalidSquadId>()(
  "InvalidSquadId",
  {}
) {}

const brandedSquadId = makeBrandedPositiveInt(
  "SquadId",
  "SquadId.parse",
  () => new InvalidSquadId()
);

/** A persisted squad id. */
export const SquadId = brandedSquadId.schema;
export type SquadId = typeof SquadId.Type;

/** Parse a positive integer as a squad id. */
export const parseSquadId = brandedSquadId.parse;
