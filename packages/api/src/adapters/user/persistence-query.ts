import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { UserAdapterError } from "./user-adapter-error.ts";

function projectPersistenceError<E>(
  operation: string,
  error: E
): Exclude<E, EffectDrizzleQueryError | SqlError> | UserAdapterError;
function projectPersistenceError(operation: string, error: unknown): unknown {
  return error instanceof EffectDrizzleQueryError || isSqlError(error)
    ? new UserAdapterError({ cause: error, operation })
    : error;
}

// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
/**
 * Projects Drizzle query and transaction infrastructure failures while preserving
 * domain failures produced by a transaction callback.
 */
export const userPersistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) =>
  Effect.mapError(self, (error) => projectPersistenceError(operation, error));
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
