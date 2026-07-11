import { createDatabase } from "@tepirek-revamped/db";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { describe, expect, it } from "vitest";

describe("Better Auth config", () => {
  it("constructs auth from an injected Effect config service", async () => {
    const { database, pool } = createDatabase(
      "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
    );
    const { AuthConfig, makeAuth } = await import("./index.js");

    const auth = Effect.runSync(
      makeAuth(database).pipe(
        Effect.provide(
          Layer.succeed(AuthConfig, {
            betterAuthSecret: Redacted.make("test-secret"),
            betterAuthUrl: "http://localhost:3000",
            corsOrigin: "http://localhost:3001",
            discordClientId: "test-discord-client-id",
            discordClientSecret: Redacted.make("test-discord-client-secret"),
            isProduction: false,
          })
        )
      )
    );

    expect(auth.handler).toBeTypeOf("function");
    await pool.end();
  });
});
