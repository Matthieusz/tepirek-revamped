import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { UserAdapterError } from "./user-adapter-error.ts";

// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
/**
 * Projects Drizzle query and transaction infrastructure failures while preserving
 * domain failures produced by a transaction callback.
 */
export function userPersistenceQuery<A, R>(
  operation: string,
  self: Effect.Effect<A, EffectDrizzleQueryError, R>
): Effect.Effect<A, UserAdapterError, R>;
export function userPersistenceQuery<A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  Exclude<E, EffectDrizzleQueryError | SqlError> | UserAdapterError,
  R
>;
export function userPersistenceQuery<A, R>(
  operation: string,
  self: Effect.Effect<A, unknown, R>
): Effect.Effect<A, unknown, R> {
  return Effect.catch(self, (error) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "_tag" in error &&
      error._tag === "EffectDrizzleQueryError"
    ) {
      return Effect.fail(new UserAdapterError({ cause: error, operation }));
    }

    return isSqlError(error)
      ? Effect.fail(new UserAdapterError({ cause: error, operation }))
      : Effect.fail(error);
  });
}
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
