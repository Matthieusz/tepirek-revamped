import { describe, expect, it } from "@effect/vitest";
import { createDatabase } from "@tepirek-revamped/db";
import * as Cause from "effect/Cause";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Redacted from "effect/Redacted";

import {
  AuthConfig,
  AuthConfigLiveLayer,
  BetterAuthService,
  createAuth,
  makeBetterAuthServiceLayer,
} from "./index.ts";
import type { BetterAuthInstance } from "./index.ts";

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

describe("Better Auth service", () => {
  it.effect(
    "projects rejected vendor session calls into a typed failure",
    () => {
      const cause = new Error("session store unavailable");
      // SAFETY: The service only reads api.getSession in this test fixture.
      const instance = {
        api: {
          getSession: () => Promise.reject(cause),
        },
      } as unknown as BetterAuthInstance;

      return Effect.gen(function* rejectedSessionCall() {
        const auth = yield* BetterAuthService;
        const failure = yield* auth.getSession(new Headers()).pipe(Effect.flip);

        expect(failure._tag).toBe("BetterAuthUnavailable");
        expect(failure.cause).toBe(cause);
      }).pipe(Effect.provide(makeBetterAuthServiceLayer(instance)));
    }
  );
});

describe("Better Auth config", () => {
  it.effect("constructs auth through the pure construction seam", () =>
    Effect.gen(function* constructAuth() {
      const { database } = yield* Effect.acquireRelease(
        Effect.sync(() =>
          createDatabase(
            "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
          )
        ),
        ({ pool }) => Effect.promise(() => pool.end())
      );
      const auth = createAuth(
        {
          betterAuthSecret: Redacted.make("test-secret"),
          betterAuthUrl: new URL("http://localhost:3000"),
          corsOrigin: new URL("http://localhost:3001"),
          discordClientId: "test-discord-client-id",
          discordClientSecret: Redacted.make("test-discord-client-secret"),
          isProduction: false,
        },
        database
      );

      expect(auth.handler).toBeTypeOf("function");
    })
  );

  for (const [variable, value] of [
    ["BETTER_AUTH_SECRET", ""],
    ["BETTER_AUTH_SECRET", "short-secret-sentinel"],
    ["BETTER_AUTH_URL", "not a URL"],
    ["CORS_ORIGIN", ""],
    ["CORS_ORIGIN", "not a URL"],
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
          if (variable.includes("SECRET") && value.length > 0) {
            expect(String(exit)).not.toContain(value);
          }
        }
      })
    );
  }
});
