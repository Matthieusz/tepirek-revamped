import { describe, expect, it } from "vitest";

process.env.CORS_ORIGIN = "http://localhost:3001";

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
