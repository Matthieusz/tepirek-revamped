import type { Database } from "@tepirek-revamped/db";
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

export interface AuthEnv {
  readonly betterAuthSecret: Redacted.Redacted;
  readonly betterAuthUrl: string;
  readonly corsOrigin: string;
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
  betterAuthUrl: Config.string("BETTER_AUTH_URL"),
  corsOrigin: Config.string("CORS_ORIGIN").pipe(Config.withDefault("")),
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

/**
 * Effect config service for Better Auth's runtime configuration.
 *
 * Secrets remain redacted until `createAuth`, the synchronous Better Auth
 * construction boundary that requires raw strings.
 */
export class AuthConfig extends Context.Service<AuthConfig, AuthEnv>()(
  "@tepirek-revamped/auth/AuthConfig"
) {}

/** Live Better Auth config layer backed by Effect's environment provider. */
export const AuthConfigLiveLayer = Layer.effect(AuthConfig, authEnvConfig);

/**
 * Read Better Auth configuration through Effect Config.
 *
 * Tests can provide `AuthConfig` directly instead of mutating process.env.
 */
export const readAuthEnv = AuthConfig;

/**
 * Pure Better Auth construction seam.
 *
 * Better Auth and its Drizzle adapter require synchronous raw strings, so
 * secrets are unwrapped only while constructing that library instance.
 */
export const createAuth = (env: AuthEnv, database: Database) =>
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
    baseURL: env.betterAuthUrl,
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
    trustedOrigins: [env.corsOrigin],

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

/** Build Better Auth from provided config and database resources. */
export const makeAuth = (database: Database) =>
  readAuthEnv.pipe(Effect.map((env) => createAuth(env, database)));

/** Better Auth instance constructed by the executable composition root. */
export type Auth = ReturnType<typeof createAuth>;
