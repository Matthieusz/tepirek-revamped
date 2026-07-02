import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** Global discovery visibility for a squad group. */
export type SquadGroupVisibility = "private" | "global";

/** Failure returned when a persisted or submitted squad group visibility is unknown. */
export interface InvalidSquadGroupVisibility {
  readonly _tag: "InvalidSquadGroupVisibility";
}

/** Parse a squad group visibility into the domain value. */
export const parseSquadGroupVisibility = (
  input: string
): Result<SquadGroupVisibility, InvalidSquadGroupVisibility> => {
  if (input === "private" || input === "global") {
    return ok(input);
  }

  return err({ _tag: "InvalidSquadGroupVisibility" });
};
