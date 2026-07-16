import { describe, expect, it } from "vitest";

// Dummy values for smoke tests only — the server auth module requires these
// env vars at import time, but these tests do not exercise Discord login.
// Real Discord credentials belong in apps/server/.env (git-ignored).
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.CORS_ORIGIN = "http://localhost:3001";
process.env.DATABASE_URL =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
process.env.DISCORD_CLIENT_ID = "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "test-discord-client-secret";
process.env.DISCORD_SERVER_ID = "test-discord-server-id";
process.env.FIRECRAWL_API_KEY = "test-firecrawl-api-key";

const importApp = async () => {
  const module = await import("./index.js");
  return module.app;
};

describe("server smoke", () => {
  it("responds to the Effect HttpApi health endpoint", async () => {
    const app = await importApp();

    const response = await app.request("/health");

    await expect(response.json()).resolves.toBe("OK");
    expect(response.status).toBe(200);
  });

  it("handles CORS preflight for the configured origin", async () => {
    const app = await importApp();

    const response = await app.request("/health", {
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
