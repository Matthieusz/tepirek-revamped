import { NoopLogger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { requireEnv } from "./env.js";

export const dbPool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

export const db = drizzle({
  client: dbPool,
  // Drizzle query logs include raw SQL parameters. Keep them out of the
  // production observability pipeline; add explicit, redacted operation logs at
  // API/store boundaries instead.
  logger: new NoopLogger(),
});
