import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";

/** Options exposed at the Promise boundary used by query functions. */
export type EffectPromiseOptions = Pick<Effect.RunOptions, "signal">;

const interruptionError = (): DOMException =>
  new DOMException("The operation was aborted.", "AbortError");

/**
 * Runs an Effect with a scoped dependency layer and preserves typed failures
 * when crossing into Promise-based framework APIs.
 */
export const makeEffectPromiseRunner =
  <Service>(layer: Layer.Layer<Service>) =>
  async <A, E>(
    effect: Effect.Effect<A, E, Service>,
    options?: EffectPromiseOptions
  ): Promise<A> => {
    const exit = await Effect.runPromiseExit(
      effect.pipe(Effect.provide(layer, { local: true })),
      options
    );

    if (Exit.isSuccess(exit)) {
      return exit.value;
    }

    const typedError = Cause.findErrorOption(exit.cause);

    if (Predicate.isTagged("Some")(typedError)) {
      // Typed failures are intentionally not restricted to Error: protocol
      // failures are data values that must remain recognizable to the caller.
      // oxlint-disable-next-line typescript/only-throw-error -- preserve typed protocol failures
      throw typedError.value;
    }

    if (Cause.hasInterruptsOnly(exit.cause)) {
      throw interruptionError();
    }

    // Defects are intentionally rethrown unchanged for boundary diagnostics.
    // oxlint-disable-next-line typescript/only-throw-error -- preserve defect identity
    throw Cause.squash(exit.cause);
  };
