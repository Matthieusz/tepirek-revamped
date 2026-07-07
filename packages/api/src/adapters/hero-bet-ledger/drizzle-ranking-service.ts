/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, heroBet, userStats } from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parsePointWorth } from "../../domain/hero-bet-ledger/points.js";
import {
  RankingNotFound,
  RankingPersistenceUnavailable,
} from "../../services/ranking/ranking-errors.js";
import type {
  GetRankingInput,
  RankingRow,
  RankingServiceInterface,
} from "../../services/ranking/ranking-service.js";
import { RankingService } from "../../services/ranking/ranking-service.js";
import type { EffectPgDatabase } from "./persistence-query.js";

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown>
) =>
  self.pipe(
    Effect.mapError(
      (cause) => new RankingPersistenceUnavailable({ cause, operation })
    )
  );

const buildUserStatsWhere = (input: {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
}): SQL | undefined => {
  const conditions: SQL[] = [];
  if (input.eventId !== undefined) {
    conditions.push(eq(userStats.eventId, input.eventId));
  }
  if (input.heroId !== undefined) {
    conditions.push(eq(userStats.heroId, input.heroId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
};

const normalizeRankingRow = (row: {
  readonly totalBets: number | string;
  readonly totalEarnings: string;
  readonly totalPoints: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}): RankingRow => ({
  ...row,
  totalBets: Number(row.totalBets),
});

const getHeroStatsWithDatabase =
  (database: EffectPgDatabase) => (heroId: number) =>
    Effect.gen(function* getHeroStats() {
      const statsRows = yield* persistenceQuery(
        "getHeroStats.stats",
        database
          .select({
            totalBets: sql<number>`COALESCE(SUM(${userStats.bets}), 0)`.as(
              "total_bets"
            ),
            totalPoints:
              sql<string>`COALESCE(SUM(${userStats.points}), '0')`.as(
                "total_points"
              ),
          })
          .from(userStats)
          .where(eq(userStats.heroId, heroId))
      );
      const heroRows = yield* persistenceQuery(
        "getHeroStats.hero",
        database
          .select({ id: hero.id, name: hero.name, pointWorth: hero.pointWorth })
          .from(hero)
          .where(eq(hero.id, heroId))
      );
      const [heroInfo] = heroRows;
      if (heroInfo === undefined) {
        return yield* new RankingNotFound({ message: "Heros nie znaleziony" });
      }
      const [stats] = statsRows;
      return {
        currentPointWorth: Number(heroInfo.pointWorth),
        heroId,
        heroName: heroInfo.name,
        totalBets: Number(stats?.totalBets ?? 0),
        totalPoints: Number.parseFloat(stats?.totalPoints ?? "0"),
      };
    });

const getOldestUnpaidEventWithDatabase = (database: EffectPgDatabase) => () =>
  Effect.gen(function* getOldestUnpaidEvent() {
    const result = yield* persistenceQuery(
      "getOldestUnpaidEvent",
      database
        .select({ eventId: userStats.eventId })
        .from(userStats)
        .innerJoin(event, eq(userStats.eventId, event.id))
        .where(eq(userStats.paidOut, false))
        .groupBy(userStats.eventId, event.endTime)
        .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
        .orderBy(sql`${event.endTime} ASC`)
        .limit(1)
    );
    return result[0]?.eventId ?? null;
  });

const getRankingWithDatabase =
  (database: EffectPgDatabase) => (input: GetRankingInput) =>
    Effect.gen(function* getRanking() {
      const whereClause = buildUserStatsWhere(input);

      const ranking = yield* persistenceQuery(
        "getRanking.ranking",
        database
          .select({
            totalBets: sql<number>`SUM(${userStats.bets})`.as("total_bets"),
            totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
              "total_earnings"
            ),
            totalPoints: sql<string>`SUM(${userStats.points})`.as(
              "total_points"
            ),
            userId: userStats.userId,
            userImage: user.image,
            userName: user.name,
          })
          .from(userStats)
          .innerJoin(user, eq(userStats.userId, user.id))
          .where(whereClause)
          .groupBy(userStats.userId, user.name, user.image)
          .orderBy(desc(sql`SUM(${userStats.points})`))
      );

      let totalBets = 0;
      if (input.heroId !== undefined) {
        const betsRows = yield* persistenceQuery(
          "getRanking.totalHeroBets",
          database
            .select({ count: sql<number>`count(*)` })
            .from(heroBet)
            .where(eq(heroBet.heroId, input.heroId))
        );
        totalBets = Number(betsRows[0]?.count ?? 0);
      } else if (input.eventId === undefined) {
        const betsRows = yield* persistenceQuery(
          "getRanking.totalBets",
          database.select({ count: sql<number>`count(*)` }).from(heroBet)
        );
        totalBets = Number(betsRows[0]?.count ?? 0);
      } else {
        const betsRows = yield* persistenceQuery(
          "getRanking.totalEventBets",
          database
            .select({ count: sql<number>`count(*)` })
            .from(heroBet)
            .innerJoin(hero, eq(heroBet.heroId, hero.id))
            .where(eq(hero.eventId, input.eventId))
        );
        totalBets = Number(betsRows[0]?.count ?? 0);
      }

      const pointWorthRows =
        input.heroId === undefined
          ? null
          : yield* persistenceQuery(
              "getRanking.pointWorth",
              database
                .select({ pointWorth: hero.pointWorth })
                .from(hero)
                .where(eq(hero.id, input.heroId))
            );
      const pointWorth =
        pointWorthRows === null
          ? null
          : parsePointWorth(pointWorthRows[0]?.pointWorth ?? null);

      return {
        pointWorth,
        ranking: ranking.map(normalizeRankingRow),
        totalBets,
      };
    });

const makeService = (database: EffectPgDatabase): RankingServiceInterface => ({
  getHeroStats: Effect.fn("RankingService.getHeroStats")((heroId: number) =>
    getHeroStatsWithDatabase(database)(heroId)
  ),
  getOldestUnpaidEvent: Effect.fn("RankingService.getOldestUnpaidEvent")(
    getOldestUnpaidEventWithDatabase(database)
  ),
  getRanking: Effect.fn("RankingService.getRanking")((input: GetRankingInput) =>
    getRankingWithDatabase(database)(input)
  ),
});

export const DrizzleRankingServiceLayer: Layer.Layer<
  RankingService,
  never,
  EffectDatabase
> = Layer.effect(
  RankingService,
  EffectDatabase.useSync((database) => RankingService.of(makeService(database)))
);
