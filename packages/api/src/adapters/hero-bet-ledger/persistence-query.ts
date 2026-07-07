import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";

export type { EffectPgDatabase };

/** Transaction-scoped database handle for multi-statement operations. */
export type TransactionDatabase = Parameters<
  Parameters<EffectPgDatabase["transaction"]>[0]
>[0];
