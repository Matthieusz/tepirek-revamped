import { Crypto, Effect, Layer, Logger, References } from "effect";
import type { LogLevel } from "effect/LogLevel";

import * as Logging from "./observability/logging.ts";
import * as Otlp from "./observability/otlp.ts";

const makeRunId = Effect.gen(function* makeObservabilityRunId() {
  const cryptoService = yield* Crypto.Crypto;
  const uuid = yield* cryptoService.randomUUIDv4;
  return uuid.slice(0, 8);
});

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

/** Build application logging and native environment-configured OTLP export. */
export const makeLayer = (config: ObservabilityConfig) =>
  Layer.unwrap(
    makeRunId.pipe(
      Effect.map((runId) => {
        const applicationLogs = makeLoggerLayer(
          config.printLogs ? [Logging.makeStderrLogger(runId)] : []
        );
        const logs = Otlp.loggerLayer(config, runId).pipe(
          Layer.provide(applicationLogs),
          Layer.provide(
            Layer.succeed(References.MinimumLogLevel, config.minimumLogLevel)
          )
        );

        return Layer.merge(logs, Otlp.tracingLayer(config, runId));
      })
    )
  );

export { parseLogLevel } from "./observability/logging.ts";
