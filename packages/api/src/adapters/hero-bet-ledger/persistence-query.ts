import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

export type { EffectPgDatabase };

function projectPersistenceError<E, P>(
  operation: string,
  error: E,
  makeError: (cause: EffectDrizzleQueryError | SqlError, operation: string) => P
): Exclude<E, EffectDrizzleQueryError | SqlError> | P;
function projectPersistenceError<P>(
  operation: string,
  error: unknown,
  makeError: (cause: EffectDrizzleQueryError | SqlError, operation: string) => P
): unknown {
  return error instanceof EffectDrizzleQueryError || isSqlError(error)
    ? makeError(error, operation)
    : error;
}

/** Map native Drizzle and SQL failures while preserving callback domain errors. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.mapError is not Promise.catch.
export const mapPersistenceErrors = <A, E, P, R>(
  operation: string,
  self: Effect.Effect<A, E, R>,
  makeError: (cause: EffectDrizzleQueryError | SqlError, operation: string) => P
): Effect.Effect<A, Exclude<E, EffectDrizzleQueryError | SqlError> | P, R> =>
  Effect.mapError(self, (error) =>
    projectPersistenceError(operation, error, makeError)
  );
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params

/** Decodes persisted data and projects schema drift through the service's persistence error. */
export const decodePersistedValue = <A, PersistenceError>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
  operation: string,
  makeError: (cause: unknown, operation: string) => PersistenceError
) =>
  Schema.decodeUnknownEffect(schema)(input).pipe(
    Effect.mapError((cause) => makeError(cause, operation))
  );

/** Transaction-scoped database handle for multi-statement operations. */
export type TransactionDatabase = Parameters<
  Parameters<EffectPgDatabase["transaction"]>[0]
>[0];
