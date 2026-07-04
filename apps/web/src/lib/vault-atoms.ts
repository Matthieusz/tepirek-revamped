import { Atom, Result } from "@effect-atom/atom-react";
import type { VaultRow } from "@tepirek-revamped/api/modules/vault/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type VaultEntry = typeof VaultRow.Type;

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
export const vaultAtom = (payload: { readonly eventId?: number }) =>
  appHttpApiAtom(
    Effect.gen(function* getVaultEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.getVault({ payload });
    })
  );

/** Resource atom for user stats rows, optionally filtered by event. */
export const userStatsAtom = (payload: { readonly eventId?: number }) =>
  appHttpApiAtom(
    Effect.gen(function* getUserStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.vault.getUserStats({ payload });
    })
  );

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
export const optimisticVaultAtom = (payload: { readonly eventId?: number }) =>
  Atom.optimistic(vaultAtom(payload).pipe(Atom.map(getVaultRowsOrEmpty)));

/** Optimistic mutation atom for toggling a user's paid-out state in a vault list. */
export const togglePaidOutInVaultAtom = (payload: {
  readonly eventId?: number;
}) =>
  optimisticVaultAtom(payload).pipe(
    Atom.optimisticFn({
      fn: togglePaidOutRequestAtom,
      reducer: setPaidOutForUser,
    })
  );

/** Mutation atom for toggling paid-out state when the caller does not own a vault list. */
export const togglePaidOutAtom = togglePaidOutRequestAtom;
