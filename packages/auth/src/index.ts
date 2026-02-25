import { db } from "@tepirek-revamped/db";
// biome-ignore lint/performance/noNamespaceImport: <one time use>
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const ensureEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

const betterAuthSecret = ensureEnv("BETTER_AUTH_SECRET");
const betterAuthUrl = ensureEnv("BETTER_AUTH_URL");
const discordClientId = ensureEnv("DISCORD_CLIENT_ID");
const discordClientSecret = ensureEnv("DISCORD_CLIENT_SECRET");
const corsOrigin = process.env.CORS_ORIGIN || "";
const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  advanced: isProduction
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
  baseURL: betterAuthUrl,
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
  secret: betterAuthSecret,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  socialProviders: {
    discord: {
      clientId: discordClientId,
      clientSecret: discordClientSecret,
    },
  },
  trustedOrigins: [corsOrigin],

  user: {
    additionalFields: {
      role: {
        default: "user",
        required: true,
        type: "string",
      },
      verified: {
        default: false,
        required: true,
        type: "boolean",
      },
    },
  },
});
