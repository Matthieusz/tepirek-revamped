import { sql } from "drizzle-orm";

import type { TransactionDatabase } from "./persistence-query.ts";

const heroLedgerLockNamespace = "hero-ledger";

/** Serialize every mutation that can change one hero's ledger aggregates. */
export const lockHeroLedger = (tx: TransactionDatabase, heroId: number) =>
  tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`${heroLedgerLockNamespace}:${heroId}`}))`
  );
