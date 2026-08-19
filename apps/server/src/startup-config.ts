import { readFirecrawlConfig } from "@tepirek-revamped/api/adapters/squad-builder/firecrawl/firecrawl-config";
import { readDiscordVerificationConfig } from "@tepirek-revamped/api/adapters/user/discord-verification-config";
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

/** Values parsed at the executable boundary and required to build the server. */
export interface StartupConfig {
  readonly auth: AuthEnv;
  readonly corsOrigin: string;
  readonly databaseUrl: Redacted.Redacted;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
  readonly observability: ObservabilityConfig;
}

const validateDatabaseUrl = (value: string) =>
  Schema.decodeEffect(Schema.URLFromString)(value).pipe(
    Effect.asVoid,
    Effect.mapError(
      () =>
        new StartupConfigurationError({
          message: "DATABASE_URL must be a valid absolute URL",
          variable: "DATABASE_URL",
        })
    )
  );

const databaseUrlConfig = Config.redacted("DATABASE_URL");

/** Minimal configuration required by the explicit legend-catalog sync command. */
export const readLegendCatalogSyncConfig = databaseUrlConfig.pipe(
  Effect.flatMap((databaseUrl) =>
    validateDatabaseUrl(Redacted.value(databaseUrl)).pipe(
      Effect.as({ databaseUrl })
    )
  )
);

const readObservabilityConfig = Config.all({
  minimumLogLevel: Config.logLevel("TEPIREK_LOG_LEVEL").pipe(
    Config.withDefault("Info")
  ),
  nodeEnvironment: Config.string("NODE_ENV").pipe(
    Config.withDefault("development")
  ),
  printLogs: Config.boolean("TEPIREK_PRINT_LOGS").pipe(
    Config.withDefault(false)
  ),
  serviceVersion: Config.string("npm_package_version").pipe(
    Config.withDefault("0.0.0")
  ),
}).pipe(
  Config.map(
    (values) =>
      ({
        deploymentEnvironmentName: values.nodeEnvironment,
        minimumLogLevel: values.minimumLogLevel,
        printLogs: values.printLogs,
        serviceVersion: values.serviceVersion,
      }) satisfies ObservabilityConfig
  )
);

/** Parse and validate application configuration before server startup. */
export const readStartupConfig: Effect.Effect<
  StartupConfig,
  Config.ConfigError | StartupConfigurationError,
  AuthConfig
> = Effect.gen(function* readStartupConfigEffect() {
  const [auth, databaseUrl, discord, firecrawl, observability] =
    yield* Effect.all([
      AuthConfig,
      databaseUrlConfig,
      readDiscordVerificationConfig,
      readFirecrawlConfig,
      readObservabilityConfig,
    ] as const);

  yield* validateDatabaseUrl(Redacted.value(databaseUrl));

  return {
    auth,
    corsOrigin: auth.corsOrigin.origin,
    databaseUrl,
    discordGuildId: discord.guildId,
    firecrawl,
    observability,
  };
});
