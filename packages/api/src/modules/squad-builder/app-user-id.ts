import * as Schema from "effect/Schema";

import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";

/** A parsed BetterAuth application user id. */
export type AppUserId = string & { readonly __brand: "AppUserId" };

/** HTTP/API schema for a BetterAuth application user id. */
export const AppUserIdSchema = Schema.NonEmptyString.annotate({
  identifier: "AppUserId",
});

/** Failure returned when an app user id is missing or empty. */
export interface InvalidAppUserId {
  readonly _tag: "InvalidAppUserId";
}

/** Parse a BetterAuth user id into the squad-builder domain id. */
export const parseAppUserId = (
  input: string
): Outcome<AppUserId, InvalidAppUserId> => {
  if (input.trim().length === 0) {
    return fail({ _tag: "InvalidAppUserId" });
  }

  // SAFETY: non-empty string established the AppUserId invariant.
  return success(input as AppUserId);
};

/** Convert an app user id to its primitive representation. */
export const appUserIdToString = (userId: AppUserId): string => userId;
