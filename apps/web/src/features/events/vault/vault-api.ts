import type {
  DistributeGoldPayload,
  TogglePaidOutPayload,
} from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import { Effect } from "effect";

import { asAppUserId, asEventId, asHeroId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Browser input for selecting all vault rows or one event's rows. */
export interface VaultInput {
  readonly eventId?: number;
}

/** Browser input for distributing gold and identifying affected event data. */
export interface DistributeGoldInput {
  readonly eventId: number;
  readonly goldAmount: number;
  readonly heroId: number;
}

/** Browser input for changing one event's paid-out state. */
export interface TogglePaidOutInput {
  readonly eventId: number;
  readonly paidOut: boolean;
  readonly userId: string;
}

/** Loads vault rows for all events or one selected event. */
export const listVault = Effect.fn("Web.Vault.list")(function* listVaultEffect(
  input: VaultInput
) {
  const client = yield* AppHttpApiClient;
  const payload =
    input.eventId === undefined
      ? {}
      : { eventId: yield* asEventId(input.eventId) };
  return yield* client.vault.getVault({ payload });
});

/** Distributes gold after decoding the browser-provided IDs. */
export const distributeGold = Effect.fn("Web.Vault.distributeGold")(
  function* distributeGoldEffect(input: DistributeGoldInput) {
    const client = yield* AppHttpApiClient;
    const payload: DistributeGoldPayload = {
      goldAmount: input.goldAmount,
      heroId: yield* asHeroId(input.heroId),
    };
    yield* asEventId(input.eventId);
    return yield* client.vault.distributeGold({ payload });
  }
);

/** Changes paid-out state after decoding event and user IDs. */
export const togglePaidOut = Effect.fn("Web.Vault.togglePaidOut")(
  function* togglePaidOutEffect(input: TogglePaidOutInput) {
    const client = yield* AppHttpApiClient;
    const payload: TogglePaidOutPayload = {
      eventId: yield* asEventId(input.eventId),
      paidOut: input.paidOut,
      userId: yield* asAppUserId(input.userId),
    };
    return yield* client.vault.togglePaidOut({ payload });
  }
);

/** Promise runner type used by vault query and mutation adapters. */
export type VaultApiRunner = typeof runAppHttpApi;
