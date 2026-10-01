import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a squad id is invalid. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidSquadId extends Schema.TaggedError<InvalidSquadId>()(
  "InvalidSquadId",
  {}
) {}

const brandedSquadId = buildBrandedPositiveInt(
  "SquadId",
  "SquadId.parse",
  () => new InvalidSquadId()
);

/** A persisted squad id. */
export const SquadId = brandedSquadId.schema;

export type SquadId = typeof SquadId.Type;

/** Parse a positive integer as a squad id. */
export const parseSquadId = brandedSquadId.parse;
