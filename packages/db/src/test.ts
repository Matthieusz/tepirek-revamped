import * as Effect from "effect/Effect";
import { Pool } from "pg";

import { makeBetterAuthDatabase } from "./better-auth-database.ts";

/** Acquire a Better Auth database whose PostgreSQL pool closes with the Effect scope. */
export const makeTestBetterAuthDatabase = (databaseUrl: string) =>
  Effect.acquireRelease(
    Effect.sync(() => new Pool({ connectionString: databaseUrl })),
    (pool) =>
      Effect.promise(async () => {
        await pool.end();
      })
  ).pipe(Effect.map(makeBetterAuthDatabase));
