import { readFirecrawlConfig } from "@tepirek-revamped/api/adapters/squad-builder/firecrawl/firecrawl-config";
import { readDiscordVerificationConfig } from "@tepirek-revamped/api/adapters/user/discord-verification-config";
import { parseLogLevel } from "@tepirek-revamped/api/observability";
import type { ObservabilityConfig } from "@tepirek-revamped/api/observability";
import type { FirecrawlConfig } from "@tepirek-revamped/api/services/squad-builder/firecrawl-config";
import { AuthConfig } from "@tepirek-revamped/auth";
import type { AuthEnv } from "@tepirek-revamped/auth";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

class StartupConfigurationError extends Schema.TaggedErrorClass<StartupConfigurationError>()(
  "StartupConfigurationError",
  {
    message: Schema.String,
    variable: Schema.String,
  }
) {}

interface StartupConfig {
  readonly auth: AuthEnv;
  readonly corsOrigin: string;
  readonly databaseUrl: Redacted.Redacted;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
  readonly observability: ObservabilityConfig;
}

const parseUrl = (name: string, value: string) =>
  Effect.try({
    catch: () =>
      new StartupConfigurationError({
        message: `${name} must be a valid absolute URL`,
        variable: name,
      }),
    try: () => new URL(value).toString(),
  });

const parseEntries = (
  name: string,
  value: string,
  decode: boolean
): Effect.Effect<Record<string, string>, StartupConfigurationError> =>
  Effect.try({
    catch: () =>
      new StartupConfigurationError({
        message: `${name} entries must use valid non-empty key=value pairs`,
        variable: name,
      }),
    try: () => {
      if (value.length === 0) {
        return {};
      }
      return Object.fromEntries(
        value.split(",").map((entry) => {
          const separator = entry.indexOf("=");
          if (separator < 1 || separator === entry.length - 1) {
            throw new Error("invalid entry");
          }
          const key = entry.slice(0, separator).trim();
          const entryValue = entry.slice(separator + 1).trim();
          if (key.length === 0 || entryValue.length === 0) {
            throw new Error("invalid entry");
          }
          return decode
            ? [decodeURIComponent(key), decodeURIComponent(entryValue)]
            : [key, entryValue];
        })
      );
    },
  });

const readObservabilityConfig = Effect.gen(
  function* readObservabilityConfigEffect() {
    const values = yield* Config.all({
      deploymentEnvironmentName: Config.string(
        "OTEL_DEPLOYMENT_ENVIRONMENT_NAME"
      ).pipe(Config.withDefault("")),
      endpoint: Config.string("OTEL_EXPORTER_OTLP_ENDPOINT").pipe(
        Config.withDefault("")
      ),
      headers: Config.redacted("OTEL_EXPORTER_OTLP_HEADERS").pipe(
        Config.withDefault(Redacted.make(""))
      ),
      logLevel: Config.schema(
        Schema.Literals(["DEBUG", "INFO", "WARN", "ERROR"]),
        "TEPIREK_LOG_LEVEL"
      ).pipe(Config.withDefault("INFO")),
      nodeEnvironment: Config.string("NODE_ENV").pipe(
        Config.withDefault("development")
      ),
      printLogs: Config.schema(
        Schema.Literals(["0", "1"]),
        "TEPIREK_PRINT_LOGS"
      ).pipe(Config.withDefault("0")),
      resourceAttributes: Config.string("OTEL_RESOURCE_ATTRIBUTES").pipe(
        Config.withDefault("")
      ),
      serviceVersion: Config.string("npm_package_version").pipe(
        Config.withDefault("0.0.0")
      ),
    });

    const minimumLogLevel = parseLogLevel(values.logLevel);
    if (minimumLogLevel === undefined) {
      return yield* new StartupConfigurationError({
        message: "TEPIREK_LOG_LEVEL must be DEBUG, INFO, WARN, or ERROR",
        variable: "TEPIREK_LOG_LEVEL",
      });
    }
    const endpoint =
      values.endpoint.length === 0
        ? undefined
        : yield* parseUrl("OTEL_EXPORTER_OTLP_ENDPOINT", values.endpoint);
    const parsedHeaders = yield* parseEntries(
      "OTEL_EXPORTER_OTLP_HEADERS",
      Redacted.value(values.headers),
      false
    );

    return {
      deploymentEnvironmentName:
        values.deploymentEnvironmentName || values.nodeEnvironment,
      ...(endpoint === undefined ? {} : { endpoint }),
      ...(Object.keys(parsedHeaders).length === 0
        ? {}
        : { headers: values.headers }),
      minimumLogLevel,
      printLogs: values.printLogs === "1",
      resourceAttributes: yield* parseEntries(
        "OTEL_RESOURCE_ATTRIBUTES",
        values.resourceAttributes,
        true
      ),
      serviceVersion: values.serviceVersion,
    } satisfies ObservabilityConfig;
  }
);

/** Parse and validate every executable dependency before server startup. */
export const readStartupConfig: Effect.Effect<
  StartupConfig,
  Config.ConfigError | StartupConfigurationError,
  AuthConfig
> = Effect.gen(function* readStartupConfigEffect() {
  const [auth, corsOrigin, databaseUrl, discord, firecrawl, observability] =
    yield* Effect.all([
      AuthConfig,
      Config.schema(Schema.URLFromString, "CORS_ORIGIN"),
      Config.redacted("DATABASE_URL"),
      readDiscordVerificationConfig,
      readFirecrawlConfig,
      readObservabilityConfig,
    ] as const);

  yield* parseUrl("BETTER_AUTH_URL", auth.betterAuthUrl);
  yield* parseUrl("DATABASE_URL", Redacted.value(databaseUrl));

  return {
    auth,
    corsOrigin: corsOrigin.origin,
    databaseUrl,
    discordGuildId: discord.guildId,
    firecrawl,
    observability,
  };
});
