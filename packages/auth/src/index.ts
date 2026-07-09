import { db } from "@tepirek-revamped/db";
// biome-ignore lint/performance/noNamespaceImport: <one time use>
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export interface AuthEnv {
  readonly betterAuthSecret: string;
  readonly betterAuthUrl: string;
  readonly discordClientId: string;
  readonly discordClientSecret: string;
  readonly corsOrigin: string;
  readonly isProduction: boolean;
}

/**
 * Read auth environment variables at an explicit process boundary.
 *
 * Called at import time for the default `auth` export; call it explicitly
 * when constructing auth in tests or alternative setups.
 */
const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const readAuthEnv = (): AuthEnv => ({
  betterAuthSecret: getEnvOrThrow("BETTER_AUTH_SECRET"),
  betterAuthUrl: getEnvOrThrow("BETTER_AUTH_URL"),
  corsOrigin: process.env.CORS_ORIGIN ?? "",
  discordClientId: getEnvOrThrow("DISCORD_CLIENT_ID"),
  discordClientSecret: getEnvOrThrow("DISCORD_CLIENT_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
});

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
    secret: env.betterAuthSecret,
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
        clientSecret: env.discordClientSecret,
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

/**
 * Default auth instance, constructed from process.env at import time.
 *
 * This is a backward-compatible singleton. New code should prefer
 * `createAuth(readAuthEnv())` to make the env boundary explicit.
 */
export const auth = createAuth(readAuthEnv());
