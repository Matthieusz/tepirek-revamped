import { Cause, Exit } from "effect";
import type { Effect } from "effect/Effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";

/** Translate an Effect failure or runtime construction failure into an oRPC boundary error. */
export type EffectOrpcErrorMapper<E, RuntimeError> = (
  error: E | RuntimeError | unknown
) => Error;

/** Run an Effect through a shared ManagedRuntime and throw mapped oRPC errors on failure. */
export const runOrpcEffect = async <A, E, R, RuntimeError>(
  runtime: ManagedRuntime<R, RuntimeError>,
  effect: Effect<A, E, R>,
  mapError: EffectOrpcErrorMapper<E, RuntimeError>
): Promise<A> => {
  const exit = await runtime.runPromiseExit(effect);

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  throw mapError(Cause.squash(exit.cause));
};
