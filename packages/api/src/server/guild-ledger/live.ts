import * as Layer from "effect/Layer";

import { DrizzleBetServiceLayer } from "../../adapters/hero-bet-ledger/drizzle-bet-service.ts";
import { DrizzleRankingServiceLayer } from "../../adapters/hero-bet-ledger/drizzle-ranking-service.ts";
import { DrizzleVaultServiceLayer } from "../../adapters/hero-bet-ledger/drizzle-vault-service.ts";

/** Guild ledger graph; the application supplies and owns its shared database. */
export const GuildLedgerLiveLayer = Layer.mergeAll(
  DrizzleBetServiceLayer,
  DrizzleRankingServiceLayer,
  DrizzleVaultServiceLayer
);
