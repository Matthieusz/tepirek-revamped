import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** HTTP/API schema for global discovery visibility of a squad group. */
export const SquadGroupVisibilitySchema = Schema.Literals([
  "private",
  "global",
]);
/** Global discovery visibility for a squad group. */
export type SquadGroupVisibility = typeof SquadGroupVisibilitySchema.Type;

/** Failure returned when a persisted or submitted squad group visibility is unknown. */
export class InvalidSquadGroupVisibility extends Schema.TaggedErrorClass<InvalidSquadGroupVisibility>()(
  "InvalidSquadGroupVisibility",
  {}
) {}

/** Parse a squad group visibility into the domain value. */
export const parseSquadGroupVisibility = (
  input: string
): Effect.Effect<SquadGroupVisibility, InvalidSquadGroupVisibility> => {
  if (input === "private" || input === "global") {
    return Effect.succeed(input);
  }

  return Effect.fail(new InvalidSquadGroupVisibility());
};
