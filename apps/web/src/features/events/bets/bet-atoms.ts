import type {
  EventId,
  HeroId,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { Effect } from "effect";
import * as Data from "effect/Data";
import * as Atom from "effect/unstable/reactivity/Atom";

import { asAppUserId, asBetId, asEventId, asHeroId } from "@/lib/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

interface PaginatedBetInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
  readonly limit?: number | undefined;
  readonly page?: number | undefined;
}

class PaginatedBetKey extends Data.Class<{
  readonly eventId: number | undefined;
  readonly heroId: number | undefined;
  readonly limit: number | undefined;
  readonly page: number | undefined;
}> {}

interface PaginatedBetRequestPayload {
  eventId?: EventId;
  heroId?: HeroId;
  limit?: number;
  page?: number;
}

const paginatedBetKey = (input: PaginatedBetInput) =>
  new PaginatedBetKey({
    eventId: input.eventId,
    heroId: input.heroId,
    limit: input.limit,
    page: input.page,
  });

/** Resource atom for paginated bets. */
const paginatedBetsByKeyAtom = Atom.family((payload: PaginatedBetKey) =>
  appHttpApiAtom(
    Effect.gen(function* getAllPaginatedBetsEffect() {
      const client = yield* AppHttpApiClient;
      const requestPayload: PaginatedBetRequestPayload = {};
      if (payload.eventId !== undefined) {
        requestPayload.eventId = yield* asEventId(payload.eventId);
      }
      if (payload.heroId !== undefined) {
        requestPayload.heroId = yield* asHeroId(payload.heroId);
      }
      if (payload.limit !== undefined) {
        requestPayload.limit = payload.limit;
      }
      if (payload.page !== undefined) {
        requestPayload.page = payload.page;
      }
      return yield* client.bet.getAllPaginated({ payload: requestPayload });
    })
  )
);

export const paginatedBetsAtom = (input: PaginatedBetInput) =>
  paginatedBetsByKeyAtom(paginatedBetKey(input));

/** Resource atom for the latest bet used by copy-member flows. */
export const latestBetForCopyAtom = appHttpApiAtom(
  Effect.gen(function* getLatestBetForCopyEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.bet.getLatestForCopy({});
  })
);

/** Mutation atom for creating a bet. */
export const createBetAtom = appHttpApiFn(
  Effect.fn("Web.Bet.create")(function* createBetEffect(
    payload: {
      readonly heroId: number;
      readonly userIds: readonly [string, ...string[]];
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const [firstUserId, ...remainingUserIds] = payload.userIds;
    const decodedRemainingUserIds = yield* Effect.forEach((value) =>
      asAppUserId(value)
    )(remainingUserIds);
    const bet = yield* client.bet.create({
      payload: {
        heroId: yield* asHeroId(payload.heroId),
        userIds: [yield* asAppUserId(firstUserId), ...decodedRemainingUserIds],
      },
    });
    get.refresh(latestBetForCopyAtom);
    return bet;
  })
);

/** Mutation atom for deleting a bet and refreshing the active first page. */
export const deleteBetAtom = appHttpApiFn(
  Effect.fn("Web.Bet.delete")(function* deleteBetEffect(
    input: {
      readonly id: number;
      readonly refreshInput: PaginatedBetInput;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.bet.delete({
      payload: { id: yield* asBetId(input.id) },
    });
    get.refresh(paginatedBetsAtom({ ...input.refreshInput, page: 1 }));
    return result;
  })
);

/** Mutation atom for editing a bet's members. */
export const editBetAtom = appHttpApiFn(
  Effect.fn("Web.Bet.edit")(function* editBetEffect(
    payload: {
      readonly betId: number;
      readonly newUserIds: readonly [string, ...string[]];
      readonly refreshInput: PaginatedBetInput;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const [firstUserId, ...remainingUserIds] = payload.newUserIds;
    const decodedRemainingUserIds = yield* Effect.forEach((value) =>
      asAppUserId(value)
    )(remainingUserIds);
    const result = yield* client.bet.edit({
      payload: {
        betId: yield* asBetId(payload.betId),
        newUserIds: [
          yield* asAppUserId(firstUserId),
          ...decodedRemainingUserIds,
        ],
      },
    });
    get.refresh(paginatedBetsAtom(payload.refreshInput));
    return result;
  })
);
