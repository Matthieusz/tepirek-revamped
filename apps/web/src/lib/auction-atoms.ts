import { Atom, Result } from "@effect-atom/atom-react";
import type { AuctionSignupSummary } from "@tepirek-revamped/api/modules/auction/http-api-contract";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type AuctionSignup = typeof AuctionSignupSummary.Type;

const emptyAuctionSignups: readonly AuctionSignup[] = [];

const getAuctionSignupListOrEmpty = (
  result: Result.Result<readonly AuctionSignup[], unknown>
) => (Result.isSuccess(result) ? result.value : emptyAuctionSignups);

const removeAuctionSignupById = (
  signups: readonly AuctionSignup[],
  input: { readonly id: number }
) => signups.filter((signup) => signup.id !== input.id);

interface AuctionGroupInput {
  readonly profession: AuctionProfession;
  readonly type: AuctionType;
}

/** Resource atom for auction signups in one group. */
export const auctionSignupsAtom = (payload: AuctionGroupInput) =>
  appHttpApiAtom(
    Effect.gen(function* getAuctionSignupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.getAuctionSignups({ payload });
    })
  );

/** Resource atom for auction stats in one group. */
export const auctionStatsAtom = (payload: AuctionGroupInput) =>
  appHttpApiAtom(
    Effect.gen(function* getAuctionStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.getAuctionStats({ payload });
    })
  );

/** Mutation atom for toggling an auction signup. */
export const toggleAuctionSignupAtom = appHttpApiFn(
  (payload: {
    readonly column: number;
    readonly level: number;
    readonly profession: AuctionProfession;
    readonly round: number;
    readonly type: AuctionType;
  }) =>
    Effect.gen(function* toggleAuctionSignupEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.toggleAuctionSignup({ payload });
    })
);

const removeAuctionSignupRequestAtom = appHttpApiFn(
  (payload: { readonly id: number }) =>
    Effect.gen(function* removeAuctionSignupEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.removeAuctionSignup({ payload });
    })
);

/** Optimistic auction signup list atom backed by a Result-returning group resource. */
export const optimisticAuctionSignupsAtom = (payload: AuctionGroupInput) =>
  Atom.optimistic(
    auctionSignupsAtom(payload).pipe(Atom.map(getAuctionSignupListOrEmpty))
  );

/** Optimistic mutation atom for removing a signup from one auction group. */
export const removeAuctionSignupFromGroupAtom = (payload: AuctionGroupInput) =>
  optimisticAuctionSignupsAtom(payload).pipe(
    Atom.optimisticFn({
      fn: removeAuctionSignupRequestAtom,
      reducer: removeAuctionSignupById,
    })
  );

/** Mutation atom for removing a signup when the caller does not own a group list. */
export const removeAuctionSignupAtom = removeAuctionSignupRequestAtom;
