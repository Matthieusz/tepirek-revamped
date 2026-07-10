import { db } from "@tepirek-revamped/db";
// biome-ignore lint/performance/noNamespaceImport: <one time use>
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

export interface AuthEnv {
  readonly betterAuthSecret: Redacted.Redacted;
  readonly betterAuthUrl: string;
  readonly corsOrigin: string;
  readonly discordClientId: string;
  readonly discordClientSecret: Redacted.Redacted;
  readonly isProduction: boolean;
}

const authEnvConfig = Config.all({
  betterAuthSecret: Config.redacted("BETTER_AUTH_SECRET"),
  betterAuthUrl: Config.string("BETTER_AUTH_URL"),
  corsOrigin: Config.string("CORS_ORIGIN").pipe(Config.withDefault("")),
  discordClientId: Config.string("DISCORD_CLIENT_ID"),
  discordClientSecret: Config.redacted("DISCORD_CLIENT_SECRET"),
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
export const createAuth = (env: AuthEnv) =>
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
    database: drizzleAdapter(db, {
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
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
        strategy: "compact",
      },
    },
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

/** Build Better Auth from the currently provided Effect config service. */
export const makeAuth = readAuthEnv.pipe(Effect.map(createAuth));

/**
 * Backward-compatible synchronous Better Auth boundary.
 *
 * Existing consumers need a ready Better Auth instance at module load. New
 * Effect-managed code should use `makeAuth` and provide `AuthConfig` at its
 * composition root instead.
 */
export const auth = Effect.runSync(
  makeAuth.pipe(Effect.provide(AuthConfigLiveLayer))
);
