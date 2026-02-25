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
          enabled: true,
          domain: ".informati.dev",
        },
        defaultCookieAttributes: {
          secure: true,
          httpOnly: true,
          sameSite: "none",
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
    window: 60,
    max: 100,
    customRules: {
      "/get-session": false,
      "/callback/*": {
        window: 60,
        max: 20,
      },
    },
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
        type: "string",
        default: "user",
        required: true,
      },
      verified: {
        type: "boolean",
        default: false,
        required: true,
      },
    },
  },
});
