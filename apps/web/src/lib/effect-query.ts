import { Layer, ManagedRuntime, References } from "effect";
import { createEffectQueryFromManagedRuntime } from "effect-query";

/** Bridge error identities used by application failure projections and characterization tests. */
export { EffectQueryDefect, EffectQueryFailure } from "effect-query";

/** Inferred operation failure type, kept behind the local bridge boundary. */
export type { InferQueryErrorResult } from "effect-query";

/** Creates typed Query factories; the caller owns and must dispose the runtime. */
export const makeEffectQuery = <Services>(layer: Layer.Layer<Services>) => {
  const runtime = ManagedRuntime.make(
    Layer.merge(layer, Layer.succeed(References.MinimumLogLevel, "None"))
  );

  return { ...createEffectQueryFromManagedRuntime(runtime), runtime };
};
