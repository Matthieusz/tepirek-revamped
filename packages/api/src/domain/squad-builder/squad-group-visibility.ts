import * as Effect from "effect/Effect";

/** Global discovery visibility for a squad group. */
export type SquadGroupVisibility = "private" | "global";

/** Failure returned when a persisted or submitted squad group visibility is unknown. */
export interface InvalidSquadGroupVisibility {
  readonly _tag: "InvalidSquadGroupVisibility";
}

/** Parse a squad group visibility into the domain value. */
export const parseSquadGroupVisibility = (
  input: string
): Effect.Effect<SquadGroupVisibility, InvalidSquadGroupVisibility> => {
  if (input === "private" || input === "global") {
    return Effect.succeed(input);
  }

  return Effect.fail({ _tag: "InvalidSquadGroupVisibility" });
};
