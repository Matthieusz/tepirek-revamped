import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A validated account display name shown to the user and stored. */
export const AccountDisplayName = Schema.String.pipe(
  Schema.brand("AccountDisplayName")
);
export type AccountDisplayName = typeof AccountDisplayName.Type;

/** Expected failure when an account display name is not valid for storage. */
export class InvalidAccountDisplayName extends Schema.TaggedErrorClass<InvalidAccountDisplayName>()(
  "InvalidAccountDisplayName",
  {
    message: Schema.String,
  }
) {}

const accountDisplayNameRules = {
  maxLength: 80,
  minLength: 1,
  trim: true,
} as const;

/** Parse a user-facing account display name for storage. */
export const parseAccountDisplayName = (
  input: string
): Effect.Effect<AccountDisplayName, InvalidAccountDisplayName> =>
  Effect.gen(function* parseAccountDisplayNameGen() {
    const trimmed = accountDisplayNameRules.trim ? input.trim() : input;

    if (trimmed.length < accountDisplayNameRules.minLength) {
      return yield* new InvalidAccountDisplayName({
        message: "Nazwa konta nie może być pusta",
      });
    }

    if (trimmed.length > accountDisplayNameRules.maxLength) {
      return yield* new InvalidAccountDisplayName({
        message: `Nazwa konta może mieć maksymalnie ${accountDisplayNameRules.maxLength} znaków`,
      });
    }

    return AccountDisplayName.make(trimmed);
  });

/** Convert an account display name to its primitive representation. */
export const accountDisplayNameToString = (name: AccountDisplayName): string =>
  name;
