import type {
  EventId,
  HeroId,
  HeroStats,
  RankingPayload,
} from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import { Effect } from "effect";

import { asEventId, asHeroId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Browser input for ranking filters. */
export interface RankingInput {
  readonly eventId?: number;
  readonly heroId?: number;
}

interface RankingRequestPayload {
  eventId?: EventId;
  heroId?: HeroId;
}

/** Loads ranking rows for the selected event and hero filters. */
export const getRanking = Effect.fn("Web.Ranking.get")(
  function* getRankingEffect(input: RankingInput) {
    const client = yield* AppHttpApiClient;
    let payload: RankingRequestPayload = {};
    if (input.eventId !== undefined) {
      payload = { ...payload, eventId: yield* asEventId(input.eventId) };
    }
    if (input.heroId !== undefined) {
      payload = { ...payload, heroId: yield* asHeroId(input.heroId) };
    }
    return yield* client.ranking.getRanking({
      payload: payload satisfies RankingPayload,
    });
  }
);

/** Loads statistics for one valid hero ID. */
export const getHeroStats = Effect.fn("Web.Ranking.getHeroStats")(
  function* getHeroStatsEffect(heroId: number) {
    const client = yield* AppHttpApiClient;
    return yield* client.ranking.getHeroStats({
      payload: { heroId: yield* asHeroId(heroId) },
    });
  }
);

/** Loads the oldest event that still has unpaid vault entries. */
export const getOldestUnpaidEvent = Effect.fn(
  "Web.Ranking.getOldestUnpaidEvent"
)(function* getOldestUnpaidEventEffect() {
  const client = yield* AppHttpApiClient;
  return yield* client.ranking.getOldestUnpaidEvent({});
});

/** API result returned for hero statistics. */
export type HeroStatsData = HeroStats;

/** Promise runner type used by ranking query adapters. */
export type RankingApiRunner = typeof runAppHttpApi;
