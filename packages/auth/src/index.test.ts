import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { describe, expect, it } from "vitest";

// The backward-compatible `auth` singleton still initializes at module load.
// Provide its legacy synchronous dependencies before dynamically importing it.
process.env.BETTER_AUTH_SECRET = "legacy-test-secret";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.CORS_ORIGIN = "http://localhost:3001";
process.env.DATABASE_URL =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
process.env.DISCORD_CLIENT_ID = "legacy-test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "legacy-test-discord-client-secret";

describe("Better Auth config", () => {
  it("constructs auth from an injected Effect config service", async () => {
    const { AuthConfig, makeAuth } = await import("./index.js");

    const auth = Effect.runSync(
      makeAuth.pipe(
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
  });
});
