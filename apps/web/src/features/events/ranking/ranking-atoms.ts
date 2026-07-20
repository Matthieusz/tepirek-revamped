import type { HeroStats } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import { HeroIdSchema } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
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

type RankingKey = string;

const RankingKeySchema = Schema.fromJsonString(
  Schema.Tuple([Schema.NullOr(Schema.Number), Schema.NullOr(Schema.Number)])
);

const rankingKey = (payload: RankingInput): RankingKey =>
  Schema.encodeSync(RankingKeySchema)([
    payload.eventId ?? null,
    payload.heroId ?? null,
  ]);

const rankingInputFromKey = (key: RankingKey) => {
  const [eventId, heroId] = Schema.decodeUnknownSync(RankingKeySchema)(key);
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
  );
});

export const rankingAtom = (payload: RankingInput) =>
  rankingByKeyAtom(rankingKey(payload));

type HeroStatsData = typeof HeroStats.Type;

const HERO_STATS_PLACEHOLDER: HeroStatsData = {
  currentPointWorth: 0,
  heroId: HeroIdSchema.make(1),
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
