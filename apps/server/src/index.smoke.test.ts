import * as Redacted from "effect/Redacted";
import { afterAll, describe, expect, it } from "vitest";

import { makeServerApplication } from "./index.js";

const serverApplication = makeServerApplication({
  auth: {
    betterAuthSecret: Redacted.make("test-secret-at-least-32-characters"),
    betterAuthUrl: "http://localhost:3000",
    corsOrigin: "http://localhost:3001",
    discordClientId: "test-discord-client-id",
    discordClientSecret: Redacted.make("test-discord-client-secret"),
    isProduction: false,
  },
  corsOrigin: "http://localhost:3001",
  databaseUrl: Redacted.make(
    "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
  ),
  discordGuildId: "test-discord-server-id",
  firecrawl: {
    apiKey: Redacted.make("test-firecrawl-api-key"),
    monthlyRequestBudget: 900,
  },
  observability: {
    deploymentEnvironmentName: "test",
    minimumLogLevel: "Info",
    printLogs: false,
    serviceVersion: "0.0.0-test",
  },
});

afterAll(async () => {
  await serverApplication.shutdown();
});

describe("server smoke", () => {
  it("responds to the Effect HttpApi health endpoint", async () => {
    const response = await serverApplication.app.request("/health");

    await expect(response.json()).resolves.toBe("OK");
    expect(response.status).toBe(200);
  });

  it("handles CORS preflight for the configured origin", async () => {
    const response = await serverApplication.app.request("/health", {
      headers: {
        "Access-Control-Request-Method": "POST",
        Origin: "http://localhost:3001",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3001"
    );
  });
});
