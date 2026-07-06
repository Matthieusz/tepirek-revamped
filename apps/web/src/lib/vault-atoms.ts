import { Atom, Result } from "@effect-atom/atom-react";
import type { VaultRow } from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type VaultEntry = typeof VaultRow.Type;

interface VaultInput {
  readonly eventId?: number;
}

type VaultKey = string;

const vaultKey = (payload: VaultInput): VaultKey =>
  String(payload.eventId ?? "all");

const vaultInputFromKey = (key: VaultKey): VaultInput =>
  key === "all" ? {} : { eventId: Number(key) };

const emptyVaultRows: readonly VaultEntry[] = [];

const getVaultRowsOrEmpty = (
  result: Result.Result<readonly VaultEntry[], unknown>
) => (Result.isSuccess(result) ? result.value : emptyVaultRows);

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
      return yield* client.vault.getVault({ payload });
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
      return yield* client.vault.getUserStats({ payload });
    })
  );
});

export const userStatsAtom = (payload: VaultInput) =>
  userStatsByKeyAtom(vaultKey(payload));

/** Mutation atom for distributing gold for one hero. */
export const distributeGoldAtom = appHttpApiFn(
  (payload: { readonly goldAmount: number; readonly heroId: number }) =>
    Effect.gen(function* distributeGoldEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.distributeGold({ payload });
    })
);

const togglePaidOutRequestAtom = appHttpApiFn(
  (payload: {
    readonly eventId: number;
    readonly paidOut: boolean;
    readonly userId: string;
  }) =>
    Effect.gen(function* togglePaidOutEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.togglePaidOut({ payload });
    })
);

/** Optimistic vault list atom backed by a Result-returning vault resource. */
const optimisticVaultByKeyAtom = Atom.family((key: VaultKey) =>
  Atom.optimistic(vaultByKeyAtom(key).pipe(Atom.map(getVaultRowsOrEmpty)))
);

export const optimisticVaultAtom = (payload: VaultInput) =>
  optimisticVaultByKeyAtom(vaultKey(payload));

/** Optimistic mutation atom for toggling a user's paid-out state in a vault list. */
const togglePaidOutInVaultByKeyAtom = Atom.family((key: VaultKey) =>
  optimisticVaultByKeyAtom(key).pipe(
    Atom.optimisticFn({
      fn: togglePaidOutRequestAtom,
      reducer: setPaidOutForUser,
    })
  )
);

export const togglePaidOutInVaultAtom = (payload: VaultInput) =>
  togglePaidOutInVaultByKeyAtom(vaultKey(payload));

/** Mutation atom for toggling paid-out state when the caller does not own a vault list. */
export const togglePaidOutAtom = togglePaidOutRequestAtom;
