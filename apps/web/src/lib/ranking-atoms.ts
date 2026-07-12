import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
} from "@/lib/http-api-client-runtime";

interface RankingInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
}

type RankingKey = string;

const rankingKey = (payload: RankingInput): RankingKey =>
  JSON.stringify([payload.eventId ?? null, payload.heroId ?? null]);

const rankingInputFromKey = (key: RankingKey) => {
  const [eventId, heroId] = JSON.parse(key) as [number | null, number | null];
  return {
    ...(eventId === null ? {} : { eventId }),
    ...(heroId === null ? {} : { heroId }),
  };
};

/** Resource atom for ranking data. */
const rankingByKeyAtom = Atom.family((key: RankingKey) => {
  const payload = rankingInputFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getRankingEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getRanking({ payload });
    })
  );
});

export const rankingAtom = (payload: RankingInput) =>
  rankingByKeyAtom(rankingKey(payload));

interface HeroStatsData {
  readonly currentPointWorth: number;
  readonly heroId: number;
  readonly heroName: string;
  readonly totalBets: number;
  readonly totalPoints: number;
}

const HERO_STATS_PLACEHOLDER: HeroStatsData = {
  currentPointWorth: 0,
  heroId: 0,
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
      return yield* client.ranking.getHeroStats({ payload: { heroId } });
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
