import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
} from "@/lib/http-api-client-runtime";

interface RankingInput {
  readonly eventId?: number;
  readonly heroId?: number;
}

type RankingKey = string;

const rankingKey = (payload: RankingInput): RankingKey =>
  JSON.stringify([payload.eventId ?? null, payload.heroId ?? null]);

const rankingInputFromKey = (key: RankingKey): RankingInput => {
  const [eventId, heroId] = JSON.parse(key) as [number | null, number | null];
  return { eventId: eventId ?? undefined, heroId: heroId ?? undefined };
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

/** Resource atom for one hero's ranking statistics. */
const heroStatsByHeroIdAtom = Atom.family((heroId: number) =>
  appHttpApiAtom(
    Effect.gen(function* getHeroStatsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.ranking.getHeroStats({ payload: { heroId } });
    })
  )
);

export const heroStatsAtom = (payload: { readonly heroId: number }) =>
  heroStatsByHeroIdAtom(payload.heroId);

/** Resource atom for the oldest unpaid event id. */
export const oldestUnpaidEventAtom = appHttpApiAtom(
  Effect.gen(function* getOldestUnpaidEventEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.ranking.getOldestUnpaidEvent({});
  })
);
