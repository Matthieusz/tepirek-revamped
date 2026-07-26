/* eslint-disable max-classes-per-file -- Collocated live construction error schema. */
import { BetterAuthDatabaseService } from "@tepirek-revamped/db/effect";
import type { BetterAuthDatabase } from "@tepirek-revamped/db/effect";
// biome-ignore lint/performance/noNamespaceImport: <one time use>
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import {
  BetterAuthService,
  makeBetterAuthService,
} from "./better-auth-service.ts";

export {
  BetterAuthService,
  BetterAuthUnavailable,
  makeBetterAuthService,
} from "./better-auth-service.ts";
export type { BetterAuthServiceInterface } from "./better-auth-service.ts";

/** Expected startup failure when Better Auth construction rejects its inputs. */
export class BetterAuthInitializationError extends Schema.TaggedErrorClass<BetterAuthInitializationError>()(
  "BetterAuthInitializationError",
  { cause: Schema.Defect() }
) {}

/** Validated runtime values required to configure Better Auth. */
export interface AuthEnv {
  readonly betterAuthSecret: Redacted.Redacted;
  readonly betterAuthUrl: URL;
  readonly corsOrigin: URL;
  readonly discordClientId: string;
  readonly discordClientSecret: Redacted.Redacted;
  readonly isProduction: boolean;
}

const NonEmptyString = Schema.String.check(Schema.isNonEmpty());
const BetterAuthSecret = Schema.String.check(Schema.isMinLength(32));
const TrimmedNonEmptyString = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty())
);

const authEnvConfig = Config.all({
  betterAuthSecret: Config.schema(
    Schema.Redacted(BetterAuthSecret),
    "BETTER_AUTH_SECRET"
  ),
  betterAuthUrl: Config.url("BETTER_AUTH_URL"),
  corsOrigin: Config.url("CORS_ORIGIN"),
  discordClientId: Config.schema(TrimmedNonEmptyString, "DISCORD_CLIENT_ID"),
  discordClientSecret: Config.schema(
    Schema.Redacted(NonEmptyString),
    "DISCORD_CLIENT_SECRET"
  ),
  isProduction: Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((nodeEnv) => nodeEnv === "production")
  ),
});

/** Effect config service for Better Auth's runtime configuration. */
export class AuthConfig extends Context.Service<AuthConfig, AuthEnv>()(
  "@tepirek-revamped/auth/AuthConfig"
) {}

/** Live Better Auth config layer backed by Effect's environment provider. */
export const AuthConfigLiveLayer = Layer.effect(AuthConfig, authEnvConfig);

/**
 * Pure Better Auth construction seam.
 *
 * Better Auth and its Drizzle adapter require synchronous raw strings, so
 * secrets are unwrapped only while constructing that library instance.
 */
export const createAuth = (env: AuthEnv, database: BetterAuthDatabase) =>
  betterAuth({
    advanced: env.isProduction
      ? {
          crossSubDomainCookies: {
            domain: ".informati.dev",
            enabled: true,
          },
          defaultCookieAttributes: {
            httpOnly: true,
            sameSite: "none",
            secure: true,
          },
        }
      : undefined,
    baseURL: env.betterAuthUrl.toString(),
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    rateLimit: {
      customRules: {
        "/callback/*": {
          max: 20,
          window: 60,
        },
        "/get-session": false,
      },
      max: 100,
      window: 60,
    },
    secret: Redacted.value(env.betterAuthSecret),
    socialProviders: {
      discord: {
        clientId: env.discordClientId,
        clientSecret: Redacted.value(env.discordClientSecret),
      },
    },
    trustedOrigins: [env.corsOrigin.origin],
    user: {
      additionalFields: {
        role: {
          defaultValue: "user",
          input: false,
          required: true,
          type: "string",
        },
        verified: {
          defaultValue: false,
          input: false,
          required: true,
          type: "boolean",
        },
      },
    },
  });

/** Vendor Better Auth runtime instance used by Hono and evlog. */
export type BetterAuthInstance = ReturnType<typeof createAuth>;

/** Session payload returned by Better Auth's vendor API. */
export type BetterAuthSession = Awaited<
  ReturnType<BetterAuthInstance["api"]["getSession"]>
>;

/** Construct Better Auth from validated config and the shared database adapter. */
export const BetterAuthServiceLiveLayer = Layer.effect(
  BetterAuthService,
  Effect.gen(function* makeLiveBetterAuthService() {
    const config = yield* AuthConfig;
    const database = yield* BetterAuthDatabaseService;
    const instance = yield* Effect.try({
      catch: (cause) => new BetterAuthInitializationError({ cause }),
      try: () => createAuth(config, database),
    });
    return makeBetterAuthService(instance);
  })
);

/** Construct a Better Auth service layer around a supplied vendor instance. */
export const makeBetterAuthServiceLayer = (
  instance: BetterAuthInstance
): Layer.Layer<BetterAuthService> =>
  Layer.succeed(BetterAuthService, makeBetterAuthService(instance));
