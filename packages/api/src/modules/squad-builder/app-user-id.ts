import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A parsed BetterAuth application user id. */
export const AppUserId = Schema.NonEmptyString.pipe(
  Schema.brand("AppUserId")
).annotate({
  identifier: "AppUserId",
});
export type AppUserId = typeof AppUserId.Type;

/** HTTP/API schema for a BetterAuth application user id. */
export const AppUserIdSchema = AppUserId;

/** Failure returned when an app user id is missing or empty. */
export interface InvalidAppUserId {
  readonly _tag: "InvalidAppUserId";
}

/** Parse a BetterAuth user id into the squad-builder domain id. */
export const parseAppUserId = Effect.fn("AppUserId.parse")(
  function* parseAppUserId(input: string) {
    return yield* Schema.decodeUnknownEffect(AppUserId)(input).pipe(
      Effect.catchTag("SchemaError", () =>
        Effect.fail({ _tag: "InvalidAppUserId" } as const)
      )
    );
  }
);

/** Convert an app user id to its primitive representation. */
export const appUserIdToString = (userId: AppUserId): string => userId;
