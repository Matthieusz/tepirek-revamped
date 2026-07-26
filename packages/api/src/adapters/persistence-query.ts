import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { isSqlError } from "effect/unstable/sql/SqlError";
import type { SqlError } from "effect/unstable/sql/SqlError";

interface PersistenceErrorInput {
  readonly cause: EffectDrizzleQueryError | SqlError;
  readonly operation: string;
}

function projectPersistenceError<E, PersistenceError>(
  operation: string,
  error: E,
  makeError: (input: PersistenceErrorInput) => PersistenceError
): Exclude<E, EffectDrizzleQueryError | SqlError> | PersistenceError;
function projectPersistenceError<PersistenceError>(
  operation: string,
  error: unknown,
  makeError: (input: PersistenceErrorInput) => PersistenceError
): unknown {
  return error instanceof EffectDrizzleQueryError || isSqlError(error)
    ? makeError({ cause: error, operation })
    : error;
}

/** Builds a persistence failure projector while preserving callback errors. */
export const makeDirectPersistenceQuery =
  <PersistenceError>(
    makeError: (input: PersistenceErrorInput) => PersistenceError
  ) =>
  <A, E, R>(
    operation: string,
    self: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    Exclude<E, EffectDrizzleQueryError | SqlError> | PersistenceError,
    R
  > =>
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect.mapError is not Promise.catch.
    Effect.mapError(self, (error) =>
      projectPersistenceError(operation, error, makeError)
    );

/** Decodes a value read from persistence and projects schema drift as an adapter failure. */
export const decodePersistedValue = <A, PersistenceError>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
  operation: string,
  makeError: (input: {
    readonly cause: unknown;
    readonly operation: string;
  }) => PersistenceError
) =>
  Schema.decodeUnknownEffect(schema)(input).pipe(
    Effect.mapError((cause) => makeError({ cause, operation }))
  );
