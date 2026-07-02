import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { requireEnv } from "./env.js";

export const dbPool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

export const db = drizzle({
  client: dbPool,
});
