import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

export type { EffectPgDatabase };

/** Map native Drizzle and SQL failures while preserving callback domain errors. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/valid-params -- Effect.catch is not Promise.catch.
export function mapPersistenceErrors<A, E, P, R>(
  operation: string,
  self: Effect.Effect<A, E, R>,
  makeError: (cause: EffectDrizzleQueryError | SqlError, operation: string) => P
): Effect.Effect<A, Exclude<E, EffectDrizzleQueryError | SqlError> | P, R>;
export function mapPersistenceErrors<A, P, R>(
  operation: string,
  self: Effect.Effect<A, unknown, R>,
  makeError: (cause: EffectDrizzleQueryError | SqlError, operation: string) => P
): Effect.Effect<A, unknown, R> {
  return Effect.catch(self, (error) => {
    if (error instanceof EffectDrizzleQueryError) {
      return Effect.fail(makeError(error, operation));
    }

    return isSqlError(error)
      ? Effect.fail(makeError(error, operation))
      : Effect.fail(error);
  });
}
// oxlint-enable promise/prefer-await-to-callbacks, promise/valid-params

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
