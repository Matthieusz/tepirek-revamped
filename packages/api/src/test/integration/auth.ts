import { createAuth } from "@tepirek-revamped/auth";
import type { AuthEnv } from "@tepirek-revamped/auth";
import * as Redacted from "effect/Redacted";

import { testDb } from "./database.js";

const authEnv: AuthEnv = {
  betterAuthSecret: Redacted.make("test-secret"),
  betterAuthUrl: "http://localhost:3000",
  corsOrigin: "http://localhost:3001",
  discordClientId: "test-discord-client-id",
  discordClientSecret: Redacted.make("test-discord-client-secret"),
  isProduction: false,
};

/** Better Auth capability owned by the integration-test composition root. */
export const testAuth = createAuth(authEnv, testDb);
