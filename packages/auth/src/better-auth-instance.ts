import type { BetterAuthDatabase } from "@tepirek-revamped/db/effect";
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as Redacted from "effect/Redacted";

import type { AuthEnv } from "./auth-config.ts";
import { syncDiscordAvatar } from "./discord-avatar-sync.ts";

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
    databaseHooks: {
      user: {
        update: {
          before: syncDiscordAvatar,
        },
      },
    },
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
        overrideUserInfoOnSignIn: true,
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
