import type { VaultRow } from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import * as Atom from "effect/unstable/reactivity/Atom";

import { oldestUnpaidEventAtom } from "@/features/events/ranking/ranking-atoms";
import { asEventId, asHeroId, asUserId } from "@/lib/branded-ids";
import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type VaultEntry = VaultRow;

interface VaultInput {
  readonly eventId?: number | undefined;
}

type VaultKey = string;

const vaultKey = (payload: VaultInput): VaultKey =>
  String(payload.eventId ?? "all");

const vaultInputFromKey = (key: VaultKey) =>
  key === "all"
    ? {}
    : { eventId: Schema.decodeUnknownSync(Schema.FiniteFromString)(key) };

const setPaidOutForUser = (
  rows: readonly VaultEntry[],
  input: { readonly paidOut: boolean; readonly userId: string }
) =>
  rows.map((row) =>
    row.userId === input.userId ? { ...row, paidOut: input.paidOut } : row
  );

/** Resource atom for vault rows, optionally filtered by event. */
const vaultByKeyAtom = Atom.family((key: VaultKey) => {
  const payload = vaultInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getVaultEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.getVault({
        payload:
          payload.eventId === undefined
            ? {}
            : { eventId: yield* asEventId(payload.eventId) },
      });
    })
  );
});

export const vaultAtom = (payload: VaultInput) =>
  vaultByKeyAtom(vaultKey(payload));

/** Resource atom for user stats rows, optionally filtered by event. */
const userStatsByKeyAtom = Atom.family((key: VaultKey) => {
  const payload = vaultInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getUserStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.getUserStats({
        payload:
          payload.eventId === undefined
            ? {}
            : { eventId: yield* asEventId(payload.eventId) },
      });
    })
  );
});

export const userStatsAtom = (payload: VaultInput) =>
  userStatsByKeyAtom(vaultKey(payload));

/** Mutation atom for distributing gold for one hero. Refreshes affected vault resources on success. */
export const distributeGoldAtom = appHttpApiFn(
  Effect.fn("Web.Vault.distributeGold")(function* distributeGoldEffect(
    payload: {
      readonly goldAmount: number;
      readonly eventId: number;
      readonly heroId: number;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.vault.distributeGold({
      payload: {
        goldAmount: payload.goldAmount,
        heroId: yield* asHeroId(payload.heroId),
      },
    });

    const allKey = vaultKey({});
    get.refresh(vaultByKeyAtom(allKey));
    get.refresh(userStatsByKeyAtom(allKey));

    const key = vaultKey({ eventId: payload.eventId });
    get.refresh(vaultByKeyAtom(key));
    get.refresh(userStatsByKeyAtom(key));
    get.refresh(oldestUnpaidEventAtom);

    return result;
  })
);

const togglePaidOutRequestAtom = appHttpApiFn(
  Effect.fn("Web.Vault.togglePaidOut")(function* togglePaidOutEffect(
    payload: {
      readonly eventId: number;
      readonly paidOut: boolean;
      readonly userId: string;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.vault.togglePaidOut({
      payload: {
        ...payload,
        eventId: yield* asEventId(payload.eventId),
        userId: yield* asUserId(payload.userId),
      },
    });
    get.refresh(oldestUnpaidEventAtom);
    return result;
  })
);

/** Optimistic vault list atom backed by a Result-returning vault resource. */
const optimisticVaultByKeyAtom = Atom.family((key: VaultKey) =>
  Atom.optimistic(vaultByKeyAtom(key))
);

export const optimisticVaultAtom = (payload: VaultInput) =>
  optimisticVaultByKeyAtom(vaultKey(payload));

/** Optimistic mutation atom for toggling a user's paid-out state in a vault list. */
const togglePaidOutInVaultByKeyAtom = Atom.family((key: VaultKey) =>
  optimisticVaultByKeyAtom(key).pipe(
    Atom.optimisticFn({
      fn: togglePaidOutRequestAtom,
      reducer: (current, input) =>
        updateResultSuccess(current, (rows) => setPaidOutForUser(rows, input)),
    })
  )
);

export const togglePaidOutInVaultAtom = (payload: VaultInput) =>
  togglePaidOutInVaultByKeyAtom(vaultKey(payload));
