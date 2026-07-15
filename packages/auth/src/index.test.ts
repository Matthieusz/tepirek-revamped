import { describe, expect, it } from "@effect/vitest";
import { createDatabase } from "@tepirek-revamped/db";
import * as Cause from "effect/Cause";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

import { AuthConfig, AuthConfigLiveLayer, makeAuth } from "./index.ts";

const validAuthEnvironment = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
  DISCORD_CLIENT_ID: "discord-client",
  DISCORD_CLIENT_SECRET: "discord-secret",
  NODE_ENV: "test",
};

const loadAuthConfig = (environment: Record<string, string>) =>
  AuthConfig.pipe(
    Effect.provide(AuthConfigLiveLayer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(environment)
    ),
    Effect.exit
  );

describe("Better Auth config", () => {
  it.effect("constructs auth from an injected Effect config service", () =>
    Effect.gen(function* constructAuth() {
      const { database } = yield* Effect.acquireRelease(
        Effect.sync(() =>
          createDatabase(
            "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
          )
        ),
        ({ pool }) => Effect.promise(() => pool.end())
      );
      const auth = yield* makeAuth(database).pipe(
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
      );

      expect(auth.handler).toBeTypeOf("function");
    })
  );

  for (const [variable, value] of [
    ["BETTER_AUTH_SECRET", ""],
    ["BETTER_AUTH_SECRET", "short-secret-sentinel"],
    ["DISCORD_CLIENT_ID", ""],
    ["DISCORD_CLIENT_SECRET", ""],
  ] as const) {
    it.effect(`rejects invalid ${variable} through ConfigError`, () =>
      Effect.gen(function* inspectAuthConfigFailure() {
        const exit = yield* loadAuthConfig({
          ...validAuthEnvironment,
          [variable]: value,
        });

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
          expect(Cause.hasFails(exit.cause)).toBe(true);
          expect(Cause.hasDies(exit.cause)).toBe(false);
          if (value.length > 0) {
            expect(String(exit)).not.toContain(value);
          }
        }
      })
    );
  }
});
