import { AuthConfigLiveLayer } from "@tepirek-revamped/auth";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
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

const load = (environment: Record<string, string>) =>
  Effect.runPromise(
    readStartupConfig.pipe(
      Effect.provide(AuthConfigLiveLayer),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown(environment)
      )
    )
  );

describe("startup config", () => {
  it("parses all executable configuration before startup", async () => {
    const config = await load(validEnvironment);

    expect(config.corsOrigin).toBe("http://localhost:3001");
    expect(config.discordGuildId).toBe("discord-server");
    expect(config.firecrawl.monthlyRequestBudget).toBe(900);
    expect(config.observability.deploymentEnvironmentName).toBe("development");
  });

  it("rejects malformed executable and observability values", async () => {
    await expect(
      load({
        ...validEnvironment,
        CORS_ORIGIN: "not a URL",
      })
    ).rejects.toThrow("CORS_ORIGIN must be a valid absolute URL");

    await expect(
      load({
        ...validEnvironment,
        OTEL_EXPORTER_OTLP_HEADERS: "missing-value=",
      })
    ).rejects.toThrow(
      "OTEL_EXPORTER_OTLP_HEADERS entries must use non-empty key=value pairs"
    );

    await expect(
      load({
        ...validEnvironment,
        TEPIREK_LOG_LEVEL: "verbose",
      })
    ).rejects.toThrow("TEPIREK_LOG_LEVEL must be DEBUG, INFO, WARN, or ERROR");
  });
});
