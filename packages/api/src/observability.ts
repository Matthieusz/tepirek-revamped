import { Effect, Layer, Logger, References } from "effect";
import type { LogLevel } from "effect/LogLevel";

import * as Logging from "./observability/logging.js";
import * as Otlp from "./observability/otlp.js";

export interface ObservabilityConfig extends Otlp.OtlpConfig {
  readonly minimumLogLevel: LogLevel;
  readonly printLogs: boolean;
}

/** Compose the active application loggers at the observability boundary. */
export const makeLoggerLayer = <
  const Loggers extends readonly (
    | Logger.Logger<unknown, unknown>
    | Effect.Effect<Logger.Logger<unknown, unknown>, unknown, unknown>
  )[],
>(
  loggers: Loggers
) => Logger.layer(loggers, { mergeWithExisting: false });

/** Build observability from values parsed once by the executable boundary. */
export const makeLayer = (config: ObservabilityConfig) =>
  Layer.unwrap(
    Effect.gen(function* makeObservabilityLayer() {
      const logs = makeLoggerLayer([
        ...(config.printLogs ? [Logging.stderrLogger] : []),
        ...Otlp.loggers(config),
      ]).pipe(
        Layer.provide(
          Layer.succeed(References.MinimumLogLevel, config.minimumLogLevel)
        )
      );

      return Layer.merge(
        logs,
        yield* Effect.promise(() => Otlp.tracingLayer(config))
      );
    })
  );

export { parseLogLevel } from "./observability/logging.js";
