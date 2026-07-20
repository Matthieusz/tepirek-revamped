import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const accountDisplayNameRules = {
  maxLength: 80,
  minLength: 1,
} as const;

/** A validated account display name shown to the user and stored. */
export const AccountDisplayName = Schema.Trim.pipe(
  Schema.check(
    Schema.isLengthBetween(
      accountDisplayNameRules.minLength,
      accountDisplayNameRules.maxLength
    )
  ),
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

/** Parse a user-facing account display name for storage. */
export const parseAccountDisplayName = Effect.fn("AccountDisplayName.parse")(
  function* parseAccountDisplayName(
    input: string
  ): Effect.fn.Return<AccountDisplayName, InvalidAccountDisplayName> {
    return yield* Schema.decodeUnknownEffect(AccountDisplayName)(input).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidAccountDisplayName({
            message:
              input.trim().length < accountDisplayNameRules.minLength
                ? "Nazwa konta nie może być pusta"
                : `Nazwa konta może mieć maksymalnie ${accountDisplayNameRules.maxLength} znaków`,
          })
      )
    );
  }
);

/** Convert an account display name to its primitive representation. */
export const accountDisplayNameToString = (name: AccountDisplayName): string =>
  name;
