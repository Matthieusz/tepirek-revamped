import { Effect, Layer, Logger, References } from "effect";

import * as Logging from "./observability/logging.js";
import * as Otlp from "./observability/otlp.js";

export const layer = Layer.unwrap(
  Effect.gen(function* makeObservabilityLayer() {
    const logs = Logger.layer([...Logging.loggers(), ...Otlp.loggers()], {
      mergeWithExisting: false,
    }).pipe(
      Layer.merge(
        Layer.succeed(References.MinimumLogLevel, Logging.minimumLogLevel())
      )
    );

    return Layer.merge(logs, yield* Effect.promise(Otlp.tracingLayer));
  })
);
