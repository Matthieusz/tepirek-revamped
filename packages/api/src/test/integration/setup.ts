import { beforeEach } from "vitest";

import { truncateApplicationTables } from "./database.js";

process.env.BETTER_AUTH_SECRET ??= "test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.DISCORD_CLIENT_ID ??= "test-discord-client-id";
process.env.DISCORD_CLIENT_SECRET ??= "test-discord-client-secret";
process.env.DISCORD_SERVER_ID ??= "test-discord-server-id";
process.env.FIRECRAWL_API_KEY ??= "test-firecrawl-api-key";

beforeEach(async () => {
  await truncateApplicationTables();
});
