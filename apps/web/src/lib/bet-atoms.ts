import type { PaginatedBets } from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type PaginatedBetList = typeof PaginatedBets.Type;

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

const removeBetFromPage = (
  current: PaginatedBetList,
  input: { readonly id: number }
): PaginatedBetList => {
  const items = current.items.filter((bet) => bet.id !== input.id);
  const removedCount = current.items.length - items.length;
  const totalItems = Math.max(0, current.pagination.totalItems - removedCount);

  return {
    items,
    pagination: {
      ...current.pagination,
      totalItems,
    },
  };
};

/** Resource atom for paginated bets. */
const paginatedBetsByKeyAtom = Atom.family((key: PaginatedBetKey) => {
  const payload = paginatedBetInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getAllPaginatedBetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.bet.getAllPaginated({ payload });
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
  (
    payload: {
      readonly heroId: number;
      readonly userIds: readonly [string, ...string[]];
    },
    get
  ) =>
    Effect.gen(function* createBetEffect() {
      const client = yield* AppHttpApiClient;
      const bet = yield* client.bet.create({ payload });
      get.refresh(latestBetForCopyAtom);
      return bet;
    })
);

const deleteBetRequestAtom = appHttpApiFn((payload: { readonly id: number }) =>
  Effect.gen(function* deleteBetEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.bet.delete({ payload });
  })
);

/** Optimistic paginated bet atom backed by a Result-returning page resource. */
const optimisticPaginatedBetsByKeyAtom = Atom.family((key: PaginatedBetKey) =>
  Atom.optimistic(paginatedBetsByKeyAtom(key))
);

export const optimisticPaginatedBetsAtom = (input: PaginatedBetInput) =>
  optimisticPaginatedBetsByKeyAtom(paginatedBetKey(input));

/** Optimistic mutation atom for deleting a bet from one page. */
const deleteBetFromPageByKeyAtom = Atom.family((key: PaginatedBetKey) =>
  optimisticPaginatedBetsByKeyAtom(key).pipe(
    Atom.optimisticFn({
      fn: deleteBetRequestAtom,
      reducer: (current, input) =>
        updateResultSuccess(current, (page) => removeBetFromPage(page, input)),
    })
  )
);

export const deleteBetFromPageAtom = (input: PaginatedBetInput) =>
  deleteBetFromPageByKeyAtom(paginatedBetKey(input));

/** Mutation atom for editing a bet's members. */
export const editBetAtom = appHttpApiFn(
  (
    payload: {
      readonly betId: number;
      readonly newUserIds: readonly [string, ...string[]];
      readonly refreshInput: PaginatedBetInput;
    },
    get
  ) =>
    Effect.gen(function* editBetEffect() {
      const client = yield* AppHttpApiClient;
      const result = yield* client.bet.edit({
        payload: {
          betId: payload.betId,
          newUserIds: payload.newUserIds,
        },
      });
      get.refresh(paginatedBetsAtom(payload.refreshInput));
      return result;
    })
);
