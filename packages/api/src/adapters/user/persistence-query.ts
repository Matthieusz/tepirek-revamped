import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

interface UserPersistenceErrorInput {
  readonly cause: EffectDrizzleQueryError | SqlError;
  readonly operation: string;
}

/**
 * Builds the user-store query error projector without depending on the store's
 * collocated adapter error class.
 */
export const makeUserPersistenceQuery = <AdapterError>(
  makeError: (input: UserPersistenceErrorInput) => AdapterError
) => {
  function projectPersistenceError<E>(
    operation: string,
    error: E
  ): Exclude<E, EffectDrizzleQueryError | SqlError> | AdapterError;
  function projectPersistenceError(operation: string, error: unknown): unknown {
    return error instanceof EffectDrizzleQueryError || isSqlError(error)
      ? makeError({ cause: error, operation })
      : error;
  }

  // oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
  return <A, E, R>(operation: string, self: Effect.Effect<A, E, R>) =>
    Effect.mapError(self, (error) => projectPersistenceError(operation, error));
  // oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
};
