import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A parsed BetterAuth application user id. */
export const AppUserId = Schema.NonEmptyString.pipe(
  Schema.brand("AppUserId")
).annotate({
  identifier: "AppUserId",
});

export type AppUserId = typeof AppUserId.Type;

/** Failure returned when an app user id is missing or empty. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidAppUserId extends Schema.TaggedError<InvalidAppUserId>()(
  "InvalidAppUserId",
  {}
) {}

/** Parse a BetterAuth user id into the squad-builder domain id. */
export const parseAppUserId = Effect.fn("AppUserId.parse")(
  function* parseAppUserId(input: string) {
    return yield* Schema.decodeEffect(AppUserId)(input).pipe(
      Effect.catchTag("SchemaError", () => new InvalidAppUserId())
    );
  }
);
