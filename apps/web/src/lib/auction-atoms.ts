import type { AuctionSignupSummary } from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type AuctionSignup = typeof AuctionSignupSummary.Type;

const emptyAuctionSignups: readonly AuctionSignup[] = [];

const getAuctionSignupListOrEmpty = (
  result: AsyncResult.AsyncResult<readonly AuctionSignup[], unknown>
) => (AsyncResult.isSuccess(result) ? result.value : emptyAuctionSignups);

const removeAuctionSignupById = (
  signups: readonly AuctionSignup[],
  input: { readonly id: number }
) => signups.filter((signup) => signup.id !== input.id);

interface AuctionGroupInput {
  readonly profession: AuctionProfession;
  readonly type: AuctionType;
}

type AuctionGroupKey = string;

const auctionGroupKey = (payload: AuctionGroupInput): AuctionGroupKey =>
  `${payload.profession}:${payload.type}`;

const auctionGroupInputFromKey = (key: AuctionGroupKey): AuctionGroupInput => {
  const [profession, type] = key.split(":") as [AuctionProfession, AuctionType];
  return { profession, type };
};

/** Resource atom for auction signups in one group. */
const auctionSignupsByGroupAtom = Atom.family((key: AuctionGroupKey) => {
  const payload = auctionGroupInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getAuctionSignupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.getAuctionSignups({ payload });
    })
  );
});

export const auctionSignupsAtom = (payload: AuctionGroupInput) =>
  auctionSignupsByGroupAtom(auctionGroupKey(payload));

/** Resource atom for auction stats in one group. */
const auctionStatsByGroupAtom = Atom.family((key: AuctionGroupKey) => {
  const payload = auctionGroupInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getAuctionStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.auction.getAuctionStats({ payload });
    })
  );
});

export const auctionStatsAtom = (payload: AuctionGroupInput) =>
  auctionStatsByGroupAtom(auctionGroupKey(payload));

/** Mutation atom for toggling an auction signup. Refreshes the affected group on success. */
export const toggleAuctionSignupAtom = appHttpApiFn(
  (
    payload: {
      readonly column: number;
      readonly level: number;
      readonly profession: AuctionProfession;
      readonly round: number;
      readonly type: AuctionType;
    },
    get
  ) =>
    Effect.gen(function* toggleAuctionSignupEffect() {
      const client = yield* AppHttpApiClient;
      const result = yield* client.auction.toggleAuctionSignup({ payload });
      const key = auctionGroupKey({
        profession: payload.profession,
        type: payload.type,
      });
      get.refresh(auctionSignupsByGroupAtom(key));
      get.refresh(auctionStatsByGroupAtom(key));
      return result;
    })
);

/** Optimistic auction signup list atom backed by a Result-returning group resource. */
const optimisticAuctionSignupsByGroupAtom = Atom.family(
  (key: AuctionGroupKey) =>
    Atom.optimistic(
      auctionSignupsByGroupAtom(key).pipe(Atom.map(getAuctionSignupListOrEmpty))
    )
);

/** Optimistic mutation atom for removing a signup from one auction group. Refreshes signups and stats on success. */
const removeAuctionSignupFromGroupByGroupAtom = Atom.family(
  (key: AuctionGroupKey) =>
    optimisticAuctionSignupsByGroupAtom(key).pipe(
      Atom.optimisticFn({
        fn: appHttpApiFn((payload: { readonly id: number }, get) =>
          Effect.gen(function* removeAuctionSignupFromGroupEffect() {
            const client = yield* AppHttpApiClient;
            const result = yield* client.auction.removeAuctionSignup({
              payload,
            });
            get.refresh(auctionSignupsByGroupAtom(key));
            get.refresh(auctionStatsByGroupAtom(key));
            return result;
          })
        ),
        reducer: removeAuctionSignupById,
      })
    )
);

export const removeAuctionSignupFromGroupAtom = (payload: AuctionGroupInput) =>
  removeAuctionSignupFromGroupByGroupAtom(auctionGroupKey(payload));
