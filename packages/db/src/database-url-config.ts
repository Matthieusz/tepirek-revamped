import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import type * as Redacted from "effect/Redacted";

/**
 * Tag for the database connection URL config service.
 *
 * Reads `DATABASE_URL` from the Effect Config provider (environment by default)
 * and provides it as a typed service so database layer construction is driven
 * by config at the composition root rather than raw `process.env` reads.
 */
export class DatabaseUrlConfig extends Context.Service<
  DatabaseUrlConfig,
  Redacted.Redacted
>()("@tepirek-revamped/db/DatabaseUrlConfig") {}

/** Layer providing DatabaseUrlConfig from `DATABASE_URL` env var. */
export const DatabaseUrlConfigLayer = Layer.effect(
  DatabaseUrlConfig,
  Config.redacted("DATABASE_URL")
);
