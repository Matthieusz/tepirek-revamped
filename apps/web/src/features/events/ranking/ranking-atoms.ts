import type { HeroStats } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import { HeroId } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import { Effect } from "effect";
import * as Data from "effect/Data";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import { asEventId, asHeroId } from "@/lib/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
} from "@/lib/http-api-client-runtime";

interface RankingInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
}

class RankingKey extends Data.Class<{
  readonly eventId: number | undefined;
  readonly heroId: number | undefined;
}> {}

const rankingKey = (payload: RankingInput) =>
  new RankingKey({
    eventId: payload.eventId,
    heroId: payload.heroId,
  });

/** Resource atom for ranking data. */
const rankingByKeyAtom = Atom.family((payload: RankingKey) =>
  appHttpApiAtom(
    Effect.gen(function* getRankingEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getRanking({
        payload: {
          ...(payload.eventId === undefined
            ? {}
            : { eventId: yield* asEventId(payload.eventId) }),
          ...(payload.heroId === undefined
            ? {}
            : { heroId: yield* asHeroId(payload.heroId) }),
        },
      });
    })
  )
);

export const rankingAtom = (payload: RankingInput) =>
  rankingByKeyAtom(rankingKey(payload));

type HeroStatsData = HeroStats;

const HERO_STATS_PLACEHOLDER: HeroStatsData = {
  currentPointWorth: 0,
  heroId: HeroId.make(1),
  heroName: "",
  totalBets: 0,
  totalPoints: 0,
};

const disabledHeroStatsAtom = Atom.make(
  AsyncResult.success(HERO_STATS_PLACEHOLDER)
);

/** Resource atom for one hero's ranking statistics. */
const heroStatsByHeroIdAtom = Atom.family((heroId: number) =>
  appHttpApiAtom(
    Effect.gen(function* getHeroStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getHeroStats({
        payload: { heroId: yield* asHeroId(heroId) },
      });
    })
  )
);

export const heroStatsAtom = (payload: { readonly heroId: number | null }) =>
  payload.heroId === null || payload.heroId <= 0
    ? disabledHeroStatsAtom
    : heroStatsByHeroIdAtom(payload.heroId);

/** Resource atom for the oldest unpaid event id. */
export const oldestUnpaidEventAtom = appHttpApiAtom(
  Effect.gen(function* getOldestUnpaidEventEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.ranking.getOldestUnpaidEvent({});
  })
);
