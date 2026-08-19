import { describe, expect, it } from "@effect/vitest";
import { AuthConfigLiveLayer } from "@tepirek-revamped/auth";
import * as Cause from "effect/Cause";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

import {
  readLegendCatalogSyncConfig,
  readStartupConfig,
} from "./startup-config.js";

const validEnvironment = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
  DATABASE_URL: "postgresql://postgres:password@localhost:5432/tepirek",
  DISCORD_CLIENT_ID: "discord-client",
  DISCORD_CLIENT_SECRET: "discord-secret",
  DISCORD_SERVER_ID: "discord-server",
  FIRECRAWL_API_KEY: "firecrawl-secret",
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
  OTEL_EXPORTER_OTLP_HEADERS: "authorization=secret",
  OTEL_RESOURCE_ATTRIBUTES: "service.name=tepirek,region=local",
  TEPIREK_LOG_LEVEL: "Debug",
  TEPIREK_PRINT_LOGS: "yes",
};

const provideEnvironment = (environment: Record<string, string>) =>
  Effect.provideService(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromUnknown(environment)
  );

const configuredStartup = (environment: Record<string, string>) =>
  readStartupConfig.pipe(
    Effect.provide(AuthConfigLiveLayer),
    provideEnvironment(environment)
  );

const configuredLegendCatalogSync = (environment: Record<string, string>) =>
  readLegendCatalogSyncConfig.pipe(provideEnvironment(environment));

const malformedConfigurations = [
  ["BETTER_AUTH_SECRET", ""],
  ["BETTER_AUTH_SECRET", "short-auth-secret"],
  ["DISCORD_CLIENT_ID", ""],
  ["DISCORD_CLIENT_SECRET", ""],
  ["DISCORD_SERVER_ID", ""],
  ["FIRECRAWL_API_KEY", ""],
  ["BETTER_AUTH_URL", "not a URL"],
  ["CORS_ORIGIN", "not a URL"],
  ["DATABASE_URL", "not a URL"],
  ["TEPIREK_LOG_LEVEL", "verbose"],
  ["TEPIREK_PRINT_LOGS", "sometimes"],
] as const;

describe("startup config", () => {
  it.effect("parses Firecrawl configuration for catalog synchronization", () =>
    Effect.gen(function* parseSyncConfig() {
      const config = yield* configuredLegendCatalogSync(validEnvironment);

      expect(config.firecrawl.monthlyRequestBudget).toBe(900);
    })
  );

  it.effect("requires a Firecrawl API key for catalog synchronization", () =>
    Effect.gen(function* rejectMissingFirecrawlKey() {
      const { FIRECRAWL_API_KEY: _, ...environment } = validEnvironment;
      const exit = yield* Effect.exit(configuredLegendCatalogSync(environment));

      expect(Exit.isFailure(exit)).toBe(true);
    })
  );

  it.effect("parses application configuration before startup", () =>
    Effect.gen(function* parseStartupConfig() {
      const config = yield* configuredStartup(validEnvironment);

      expect(config.corsOrigin).toBe("http://localhost:3001");
      expect(config.discordGuildId).toBe("discord-server");
      expect(config.firecrawl.monthlyRequestBudget).toBe(900);
      expect(config.observability.deploymentEnvironmentName).toBe(
        "development"
      );
      expect(config.observability.minimumLogLevel).toBe("Debug");
      expect(config.observability.printLogs).toBe(true);
    })
  );

  for (const [variable, value] of malformedConfigurations) {
    it.effect(`keeps malformed ${variable} in the typed failure channel`, () =>
      Effect.gen(function* inspectStartupFailure() {
        const exit = yield* Effect.exit(
          configuredStartup({
            ...validEnvironment,
            [variable]: value,
          })
        );

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.hasFails(exit.cause)).toBe(true);
          expect(Cause.hasDies(exit.cause)).toBe(false);
        }
      })
    );
  }
});
