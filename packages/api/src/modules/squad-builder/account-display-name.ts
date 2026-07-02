import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A validated account display name shown to the user and stored. */
export type AccountDisplayName = string & {
  readonly __brand: "AccountDisplayName";
};

/** Expected failure when an account display name is not valid for storage. */
export interface InvalidAccountDisplayName {
  readonly _tag: "InvalidAccountDisplayName";
  readonly message: string;
}

const accountDisplayNameRules = {
  maxLength: 80,
  minLength: 1,
  trim: true,
} as const;

/** Parse a user-facing account display name for storage. */
export const parseAccountDisplayName = (
  input: string
): Result<AccountDisplayName, InvalidAccountDisplayName> => {
  const trimmed = accountDisplayNameRules.trim ? input.trim() : input;

  if (trimmed.length < accountDisplayNameRules.minLength) {
    return err({
      _tag: "InvalidAccountDisplayName",
      message: "Nazwa konta nie może być pusta",
    });
  }

  if (trimmed.length > accountDisplayNameRules.maxLength) {
    return err({
      _tag: "InvalidAccountDisplayName",
      message: `Nazwa konta może mieć maksymalnie ${accountDisplayNameRules.maxLength} znaków`,
    });
  }

  // SAFETY: trimmed non-empty length within maxLength established the invariant.
  return ok(trimmed as AccountDisplayName);
};

/** Convert an account display name to its primitive representation. */
export const accountDisplayNameToString = (name: AccountDisplayName): string =>
  name;
