import { db } from "@tepirek-revamped/db";
// biome-ignore lint/performance/noNamespaceImport: <one time use>
import * as schema from "@tepirek-revamped/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "compact",
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
  /*
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".informati.dev",
    },
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "none",
    },
  },
  */
});
