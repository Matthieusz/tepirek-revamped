import * as Context from "effect/Context";
import type { Pool } from "pg";

/** Scoped node-postgres pool shared by both Drizzle adapters. */
export class SharedPostgresPool extends Context.Service<
  SharedPostgresPool,
  Pool
>()("@tepirek-revamped/db/SharedPostgresPool") {}
