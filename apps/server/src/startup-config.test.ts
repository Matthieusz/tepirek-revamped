import { AuthConfigLiveLayer } from "@tepirek-revamped/auth";
import * as Cause from "effect/Cause";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import { readStartupConfig } from "./startup-config.js";

const validEnvironment = {
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
  DATABASE_URL: "postgresql://postgres:password@localhost:5432/tepirek",
  DISCORD_CLIENT_ID: "discord-client",
  DISCORD_CLIENT_SECRET: "discord-secret",
  DISCORD_SERVER_ID: "discord-server",
  FIRECRAWL_API_KEY: "firecrawl-secret",
};

const configuredStartup = (environment: Record<string, string>) =>
  readStartupConfig.pipe(
    Effect.provide(AuthConfigLiveLayer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(environment)
    )
  );

const load = (environment: Record<string, string>) =>
  Effect.runPromise(configuredStartup(environment));

const loadExit = (environment: Record<string, string>) =>
  Effect.runPromise(Effect.exit(configuredStartup(environment)));

const malformedConfigurations = [
  ["BETTER_AUTH_URL", "not a URL"],
  ["CORS_ORIGIN", "not a URL"],
  ["DATABASE_URL", "not a URL"],
  ["OTEL_EXPORTER_OTLP_ENDPOINT", "not a URL"],
  ["OTEL_EXPORTER_OTLP_HEADERS", "missing-value="],
  ["OTEL_RESOURCE_ATTRIBUTES", "invalid=%E0%A4%A"],
  ["TEPIREK_LOG_LEVEL", "verbose"],
  ["TEPIREK_PRINT_LOGS", "yes"],
] as const;

describe("startup config", () => {
  it("parses all executable configuration before startup", async () => {
    const config = await load(validEnvironment);

    expect(config.corsOrigin).toBe("http://localhost:3001");
    expect(config.discordGuildId).toBe("discord-server");
    expect(config.firecrawl.monthlyRequestBudget).toBe(900);
    expect(config.observability.deploymentEnvironmentName).toBe("development");
  });

  for (const [variable, value] of malformedConfigurations) {
    it(`keeps malformed ${variable} in the typed failure channel`, async () => {
      const exit = await loadExit({
        ...validEnvironment,
        [variable]: value,
      });

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasFails(exit.cause)).toBe(true);
        expect(Cause.hasDies(exit.cause)).toBe(false);
      }
    });
  }
});
