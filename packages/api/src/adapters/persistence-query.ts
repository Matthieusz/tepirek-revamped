import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Effect from "effect/Effect";

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
