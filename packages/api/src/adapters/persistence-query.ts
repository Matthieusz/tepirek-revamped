import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

interface PersistenceErrorInput {
  readonly cause: EffectDrizzleQueryError;
  readonly operation: string;
}

/**
 * Builds a direct Drizzle query projector while retaining the adapter-owned
 * error constructor and the query effect's success and requirement types.
 */
export const makeDirectPersistenceQuery =
  <PersistenceError>(
    makeError: (input: PersistenceErrorInput) => PersistenceError
  ) =>
  <A, R>(
    operation: string,
    self: Effect.Effect<A, EffectDrizzleQueryError, R>
  ): Effect.Effect<A, PersistenceError, R> =>
    self.pipe(Effect.mapError((cause) => makeError({ cause, operation })));

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
