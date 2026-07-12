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

export interface StartupConfig {
  readonly auth: AuthEnv;
  readonly corsOrigin: string;
  readonly databaseUrl: Redacted.Redacted;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
  readonly observability: ObservabilityConfig;
}

const parseUrl = (name: string, value: string): string => {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
};

const parseOrigin = (name: string, value: string): string => {
  const url = parseUrl(name, value);
  return new URL(url).origin;
};

const parseEntries = (
  name: string,
  value: string,
  decode: boolean
): Record<string, string> => {
  if (value.length === 0) {
    return {};
  }

  return Object.fromEntries(
    value.split(",").map((entry) => {
      const separator = entry.indexOf("=");
      if (separator < 1 || separator === entry.length - 1) {
        throw new Error(`${name} entries must use non-empty key=value pairs`);
      }
      const key = entry.slice(0, separator).trim();
      const entryValue = entry.slice(separator + 1).trim();
      if (key.length === 0 || entryValue.length === 0) {
        throw new Error(`${name} entries must use non-empty key=value pairs`);
      }
      return decode
        ? [decodeURIComponent(key), decodeURIComponent(entryValue)]
        : [key, entryValue];
    })
  );
};

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
      logLevel: Config.string("TEPIREK_LOG_LEVEL").pipe(
        Config.withDefault("INFO")
      ),
      nodeEnvironment: Config.string("NODE_ENV").pipe(
        Config.withDefault("development")
      ),
      printLogs: Config.string("TEPIREK_PRINT_LOGS").pipe(
        Config.withDefault("0")
      ),
      resourceAttributes: Config.string("OTEL_RESOURCE_ATTRIBUTES").pipe(
        Config.withDefault("")
      ),
      serviceVersion: Config.string("npm_package_version").pipe(
        Config.withDefault("0.0.0")
      ),
    });

    return yield* Effect.sync(() => {
      const minimumLogLevel = parseLogLevel(values.logLevel);
      if (minimumLogLevel === undefined) {
        throw new Error(
          "TEPIREK_LOG_LEVEL must be DEBUG, INFO, WARN, or ERROR"
        );
      }
      if (values.printLogs !== "0" && values.printLogs !== "1") {
        throw new Error("TEPIREK_PRINT_LOGS must be 0 or 1");
      }

      const endpoint =
        values.endpoint.length === 0
          ? undefined
          : parseUrl("OTEL_EXPORTER_OTLP_ENDPOINT", values.endpoint);
      const parsedHeaders = parseEntries(
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
        resourceAttributes: parseEntries(
          "OTEL_RESOURCE_ATTRIBUTES",
          values.resourceAttributes,
          true
        ),
        serviceVersion: values.serviceVersion,
      } satisfies ObservabilityConfig;
    });
  }
);

/** Parse and validate every executable dependency before server startup. */
export const readStartupConfig: Effect.Effect<
  StartupConfig,
  Config.ConfigError,
  AuthConfig
> = Effect.gen(function* readStartupConfigEffect() {
  const [auth, corsOrigin, databaseUrl, discord, firecrawl, observability] =
    yield* Effect.all([
      AuthConfig,
      Config.string("CORS_ORIGIN"),
      Config.redacted("DATABASE_URL"),
      readDiscordVerificationConfig,
      readFirecrawlConfig,
      readObservabilityConfig,
    ] as const);

  return {
    auth,
    corsOrigin: yield* Effect.sync(() =>
      parseOrigin("CORS_ORIGIN", corsOrigin)
    ),
    databaseUrl,
    discordGuildId: discord.guildId,
    firecrawl,
    observability,
  };
});
