import { Effect, Layer, Logger, References } from "effect";

import * as Logging from "./observability/logging.js";
import * as Otlp from "./observability/otlp.js";

/** Compose the active application loggers at the observability boundary. */
export const makeLoggerLayer = <
  const Loggers extends readonly (
    | Logger.Logger<unknown, unknown>
    | Effect.Effect<Logger.Logger<unknown, unknown>, unknown, unknown>
  )[],
>(
  loggers: Loggers
) =>
  Logger.layer(loggers, { mergeWithExisting: false }).pipe(
    Layer.merge(
      Layer.succeed(References.MinimumLogLevel, Logging.minimumLogLevel())
    )
  );

export const layer = Layer.unwrap(
  Effect.gen(function* makeObservabilityLayer() {
    const logs = makeLoggerLayer([...Logging.loggers(), ...Otlp.loggers()]);

    return Layer.merge(logs, yield* Effect.promise(() => Otlp.tracingLayer()));
  })
);
