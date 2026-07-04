import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
} from "@/lib/http-api-client-runtime";

/** Resource atom for ranking data. */
export const rankingAtom = (payload: {
  readonly eventId?: number;
  readonly heroId?: number;
}) =>
  appHttpApiAtom(
    Effect.gen(function* getRankingEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getRanking({ payload });
    })
  );

/** Resource atom for one hero's ranking statistics. */
export const heroStatsAtom = (payload: { readonly heroId: number }) =>
  appHttpApiAtom(
    Effect.gen(function* getHeroStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getHeroStats({ payload });
    })
  );

/** Resource atom for the oldest unpaid event id. */
export const oldestUnpaidEventAtom = appHttpApiAtom(
  Effect.gen(function* getOldestUnpaidEventEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.ranking.getOldestUnpaidEvent({});
  })
);
