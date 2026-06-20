import { describe, expect, it } from "vitest";

process.env.BETTER_AUTH_SECRET = "test-secret";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.CORS_ORIGIN = "http://localhost:3001";
process.env.DATABASE_URL =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
process.env.DISCORD_CLIENT_ID = "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "test-discord-client-secret";

const importApp = async () => {
  const module = await import("./index");
  return module.default;
};

describe("server smoke", () => {
  it("responds to the root health endpoint", async () => {
    const app = await importApp();

    const response = await app.request("/");

    await expect(response.text()).resolves.toBe("OK");
    expect(response.status).toBe(200);
  });

  it("handles CORS preflight for the configured origin", async () => {
    const app = await importApp();

    const response = await app.request("/rpc/healthCheck", {
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
