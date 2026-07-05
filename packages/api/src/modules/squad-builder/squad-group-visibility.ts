import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";

/** Global discovery visibility for a squad group. */
export type SquadGroupVisibility = "private" | "global";

/** Failure returned when a persisted or submitted squad group visibility is unknown. */
export interface InvalidSquadGroupVisibility {
  readonly _tag: "InvalidSquadGroupVisibility";
}

/** Parse a squad group visibility into the domain value. */
export const parseSquadGroupVisibility = (
  input: string
): Outcome<SquadGroupVisibility, InvalidSquadGroupVisibility> => {
  if (input === "private" || input === "global") {
    return success(input);
  }

  return fail({ _tag: "InvalidSquadGroupVisibility" });
};
