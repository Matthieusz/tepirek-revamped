import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

import { asBetId, asEventId, asHeroId, asUserId } from "@/lib/branded-ids";
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

type PaginatedBetKey = string;

const paginatedBetKey = (input: PaginatedBetInput): PaginatedBetKey =>
  JSON.stringify([
    input.eventId ?? null,
    input.heroId ?? null,
    input.limit ?? null,
    input.page ?? null,
  ]);

const paginatedBetInputFromKey = (key: PaginatedBetKey) => {
  const [eventId, heroId, limit, page] = JSON.parse(key) as [
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  return {
    ...(eventId === null ? {} : { eventId }),
    ...(heroId === null ? {} : { heroId }),
    ...(limit === null ? {} : { limit }),
    ...(page === null ? {} : { page }),
  };
};

/** Resource atom for paginated bets. */
const paginatedBetsByKeyAtom = Atom.family((key: PaginatedBetKey) => {
  const payload = paginatedBetInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getAllPaginatedBetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.bet.getAllPaginated({
        payload: {
          ...(payload.eventId === undefined
            ? {}
            : { eventId: yield* asEventId(payload.eventId) }),
          ...(payload.heroId === undefined
            ? {}
            : { heroId: yield* asHeroId(payload.heroId) }),
          ...(payload.limit === undefined ? {} : { limit: payload.limit }),
          ...(payload.page === undefined ? {} : { page: payload.page }),
        },
      });
    })
  );
});

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
  Effect.fnUntraced(function* createBetEffect(
    payload: {
      readonly heroId: number;
      readonly userIds: readonly [string, ...string[]];
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const [firstUserId, ...remainingUserIds] = payload.userIds;
    const decodedRemainingUserIds =
      yield* Effect.forEach(asUserId)(remainingUserIds);
    const bet = yield* client.bet.create({
      payload: {
        heroId: yield* asHeroId(payload.heroId),
        userIds: [yield* asUserId(firstUserId), ...decodedRemainingUserIds],
      },
    });
    get.refresh(latestBetForCopyAtom);
    return bet;
  })
);

/** Mutation atom for deleting a bet and refreshing the active first page. */
export const deleteBetAtom = appHttpApiFn(
  Effect.fnUntraced(function* deleteBetEffect(
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
  Effect.fnUntraced(function* editBetEffect(
    payload: {
      readonly betId: number;
      readonly newUserIds: readonly [string, ...string[]];
      readonly refreshInput: PaginatedBetInput;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const [firstUserId, ...remainingUserIds] = payload.newUserIds;
    const decodedRemainingUserIds =
      yield* Effect.forEach(asUserId)(remainingUserIds);
    const result = yield* client.bet.edit({
      payload: {
        betId: yield* asBetId(payload.betId),
        newUserIds: [yield* asUserId(firstUserId), ...decodedRemainingUserIds],
      },
    });
    get.refresh(paginatedBetsAtom(payload.refreshInput));
    return result;
  })
);
