import { Atom, Result } from "@effect-atom/atom-react";
import type { PaginatedBets } from "@tepirek-revamped/api/modules/bet/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type PaginatedBetList = typeof PaginatedBets.Type;

interface PaginatedBetInput {
  readonly eventId?: number;
  readonly heroId?: number;
  readonly limit?: number;
  readonly page?: number;
}

type PaginatedBetKey = string;

const paginatedBetKey = (input: PaginatedBetInput): PaginatedBetKey =>
  JSON.stringify([
    input.eventId ?? null,
    input.heroId ?? null,
    input.limit ?? null,
    input.page ?? null,
  ]);

const paginatedBetInputFromKey = (key: PaginatedBetKey): PaginatedBetInput => {
  const [eventId, heroId, limit, page] = JSON.parse(key) as [
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  return {
    eventId: eventId ?? undefined,
    heroId: heroId ?? undefined,
    limit: limit ?? undefined,
    page: page ?? undefined,
  };
};

const emptyPaginatedBets: PaginatedBetList = {
  items: [],
  pagination: {
    hasMore: false,
    limit: 0,
    page: 1,
    totalItems: 0,
    totalPages: 0,
  },
};

const getPaginatedBetsOrEmpty = (
  result: Result.Result<PaginatedBetList, unknown>
) => (Result.isSuccess(result) ? result.value : emptyPaginatedBets);

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
  Atom.optimistic(
    paginatedBetsByKeyAtom(key).pipe(Atom.map(getPaginatedBetsOrEmpty))
  )
);

export const optimisticPaginatedBetsAtom = (input: PaginatedBetInput) =>
  optimisticPaginatedBetsByKeyAtom(paginatedBetKey(input));

/** Optimistic mutation atom for deleting a bet from one page. */
const deleteBetFromPageByKeyAtom = Atom.family((key: PaginatedBetKey) =>
  optimisticPaginatedBetsByKeyAtom(key).pipe(
    Atom.optimisticFn({
      fn: deleteBetRequestAtom,
      reducer: removeBetFromPage,
    })
  )
);

export const deleteBetFromPageAtom = (input: PaginatedBetInput) =>
  deleteBetFromPageByKeyAtom(paginatedBetKey(input));

/** Mutation atom for deleting a bet when the caller does not own a page list. */
export const deleteBetAtom = deleteBetRequestAtom;

/** Mutation atom for editing a bet's members. */
export const editBetAtom = appHttpApiFn(
  (payload: {
    readonly betId: number;
    readonly newUserIds: readonly [string, ...string[]];
  }) =>
    Effect.gen(function* editBetEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.bet.edit({ payload });
    })
);
