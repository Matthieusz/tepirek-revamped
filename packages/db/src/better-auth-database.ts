import { NoopLogger } from "drizzle-orm/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import * as Context from "effect/Context";
import type { Pool } from "pg";

/** Build the node-postgres Drizzle database consumed by Better Auth. */
export const makeBetterAuthDatabase = (pool: Pool) =>
  drizzle({
    client: pool,
    logger: new NoopLogger(),
  });

/** Node-postgres Drizzle database consumed by Better Auth. */
export type BetterAuthDatabase = ReturnType<typeof makeBetterAuthDatabase>;

/** Context service for the node-postgres Drizzle database used by Better Auth. */
export class BetterAuthDatabaseService extends Context.Service<
  BetterAuthDatabaseService,
  BetterAuthDatabase
>()("@tepirek-revamped/db/BetterAuthDatabase") {}
