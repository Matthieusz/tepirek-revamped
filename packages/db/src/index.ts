import { NoopLogger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/** Create the legacy Drizzle/Postgres resources used by Better Auth. */
export const createDatabase = (databaseUrl: string) => {
  const pool = new Pool({ connectionString: databaseUrl });
  const database = drizzle({
    client: pool,
    // Drizzle query logs include raw SQL parameters.
    logger: new NoopLogger(),
  });

  return { database, pool };
};

/** Database instance accepted by the Better Auth Drizzle adapter. */
export type Database = ReturnType<typeof createDatabase>["database"];
