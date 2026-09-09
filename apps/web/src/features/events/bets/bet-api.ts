import type {
  CreateBetPayload,
  EventId,
  HeroId,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { Effect } from "effect";

import { asAppUserId, asBetId, asEventId, asHeroId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

interface PaginatedBetsRequestPayload {
  eventId?: EventId;
  heroId?: HeroId;
  limit?: number;
  page?: number;
}

/** Browser input for a paginated bet query. */
export interface PaginatedBetsInput {
  readonly eventId?: number;
  readonly heroId?: number;
  readonly limit?: number;
  readonly page?: number;
}

/** Browser input for creating a bet and refreshing its derived event data. */
export interface CreateBetInput {
  readonly eventId: number;
  readonly heroId: number;
  readonly userIds: readonly [string, ...string[]];
}

/** Browser input for deleting a bet. */
export interface DeleteBetInput {
  readonly eventId: number | undefined;
  readonly heroId: number;
  readonly id: number;
}

/** Browser input for changing a bet's members. */
export interface EditBetInput {
  readonly betId: number;
  readonly eventId: number | undefined;
  readonly heroId: number;
  readonly newUserIds: readonly [string, ...string[]];
}

/** Lists one page of bets after decoding optional browser filters. */
export const listPaginatedBets = Effect.fn("Web.Bet.listPaginated")(
  function* listPaginatedBetsEffect(input: PaginatedBetsInput) {
    const client = yield* AppHttpApiClient;
    let payload: PaginatedBetsRequestPayload = {};
    if (input.eventId !== undefined) {
      payload = { ...payload, eventId: yield* asEventId(input.eventId) };
    }
    if (input.heroId !== undefined) {
      payload = { ...payload, heroId: yield* asHeroId(input.heroId) };
    }
    if (input.limit !== undefined) {
      payload = { ...payload, limit: input.limit };
    }
    if (input.page !== undefined) {
      payload = { ...payload, page: input.page };
    }
    return yield* client.bet.getAllPaginated({ payload });
  }
);

/** Loads the latest bet used by the copy-members form action. */
export const getLatestBetForCopy = Effect.fn("Web.Bet.latestForCopy")(
  function* getLatestBetForCopyEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.bet.getLatestForCopy({});
  }
);

/** Creates a bet after decoding all IDs crossing from browser state. */
export const createBet = Effect.fn("Web.Bet.create")(function* createBetEffect(
  input: CreateBetInput
) {
  const client = yield* AppHttpApiClient;
  yield* asEventId(input.eventId);
  const [firstUserId, ...remainingUserIds] = input.userIds;
  const decodedRemainingUserIds = yield* Effect.forEach((userId) =>
    asAppUserId(userId)
  )(remainingUserIds);
  const payload: CreateBetPayload = {
    heroId: yield* asHeroId(input.heroId),
    userIds: [yield* asAppUserId(firstUserId), ...decodedRemainingUserIds],
  };
  return yield* client.bet.create({ payload });
});

/** Deletes a bet after decoding its browser-provided ID. */
export const deleteBet = Effect.fn("Web.Bet.delete")(function* deleteBetEffect(
  input: DeleteBetInput
) {
  const client = yield* AppHttpApiClient;
  yield* asHeroId(input.heroId);
  if (input.eventId !== undefined) {
    yield* asEventId(input.eventId);
  }
  return yield* client.bet.delete({
    payload: { id: yield* asBetId(input.id) },
  });
});

/** Updates a bet's members after decoding its browser-provided IDs. */
export const editBet = Effect.fn("Web.Bet.edit")(function* editBetEffect(
  input: EditBetInput
) {
  const client = yield* AppHttpApiClient;
  yield* asHeroId(input.heroId);
  if (input.eventId !== undefined) {
    yield* asEventId(input.eventId);
  }
  const [firstUserId, ...remainingUserIds] = input.newUserIds;
  const decodedRemainingUserIds = yield* Effect.forEach((userId) =>
    asAppUserId(userId)
  )(remainingUserIds);
  return yield* client.bet.edit({
    payload: {
      betId: yield* asBetId(input.betId),
      newUserIds: [yield* asAppUserId(firstUserId), ...decodedRemainingUserIds],
    },
  });
});

/** Promise runner type used by bet query and mutation adapters. */
export type BetApiRunner = typeof runAppHttpApi;
