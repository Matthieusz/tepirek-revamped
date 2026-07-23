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
import * as Schema from "effect/Schema";

import { EventId, HeroId } from "../../domain/core-identifiers.ts";
import { parsePointWorth } from "../../domain/hero-bet-ledger/points.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  RankingNotFound,
  RankingPersistenceUnavailable,
} from "../../services/ranking/ranking-errors.ts";
import type {
  GetRankingInput,
  RankingRow,
  RankingServiceInterface,
} from "../../services/ranking/ranking-service.ts";
import { RankingService } from "../../services/ranking/ranking-service.ts";
import {
  decodePersistedValue,
  mapPersistenceErrors,
} from "./persistence-query.ts";
import type { EffectPgDatabase } from "./persistence-query.ts";

const PersistedAggregateNumber = Schema.Union([
  Schema.Finite,
  Schema.FiniteFromString,
]);
const persistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) =>
  mapPersistenceErrors(
    operation,
    self,
    (cause, failedOperation) =>
      new RankingPersistenceUnavailable({
        cause,
        operation: failedOperation,
      })
  );

const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
  operation: string
) =>
  decodePersistedValue(
    schema,
    input,
    operation,
    (cause, failedOperation) =>
      new RankingPersistenceUnavailable({ cause, operation: failedOperation })
  );

const decodePointWorth = (input: unknown, operation: string) =>
  parsePointWorth(input).pipe(
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
}) =>
  Effect.gen(function* normalizeRankingRowEffect() {
    const totalBets = yield* decodePersisted(
      PersistedAggregateNumber,
      row.totalBets,
      "getRanking.decode"
    );
    const userId = yield* decodePersisted(
      AppUserId,
      row.userId,
      "getRanking.decode"
    );
    return { ...row, totalBets, userId } satisfies RankingRow;
  });

const getHeroStatsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getHeroStats(heroId: number) {
    const statsRows = yield* persistenceQuery(
      "getHeroStats.stats",
      database
        .select({
          totalBets: sql<number>`COALESCE(SUM(${userStats.bets}), 0)`.as(
            "total_bets"
          ),
          totalPoints: sql<string>`COALESCE(SUM(${userStats.points}), '0')`.as(
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
    const decodedHeroId = yield* decodePersisted(
      HeroId,
      heroId,
      "getHeroStats.decode"
    );
    const totalBets = yield* decodePersisted(
      PersistedAggregateNumber,
      stats?.totalBets ?? 0,
      "getHeroStats.decode"
    );
    const totalPoints = yield* decodePersisted(
      Schema.FiniteFromString,
      stats?.totalPoints ?? "0",
      "getHeroStats.decode"
    );
    const currentPointWorth = yield* decodePointWorth(
      heroInfo.pointWorth,
      "getHeroStats.decode"
    );
    return {
      currentPointWorth: currentPointWorth ?? 0,
      heroId: decodedHeroId,
      heroName: heroInfo.name,
      totalBets,
      totalPoints,
    };
  });

const getOldestUnpaidEventWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getOldestUnpaidEvent() {
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
    const eventId = result[0]?.eventId;
    return eventId === undefined
      ? null
      : yield* decodePersisted(EventId, eventId, "getOldestUnpaidEvent.decode");
  });

const getRankingWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getRanking(input: GetRankingInput) {
    const whereClause = buildUserStatsWhere(input);

    const ranking = yield* persistenceQuery(
      "getRanking.ranking",
      database
        .select({
          totalBets: sql<number>`SUM(${userStats.bets})`.as("total_bets"),
          totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
            "total_earnings"
          ),
          totalPoints: sql<string>`SUM(${userStats.points})`.as("total_points"),
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
      totalBets = yield* decodePersisted(
        PersistedAggregateNumber,
        betsRows[0]?.count ?? 0,
        "getRanking.decode"
      );
    } else if (input.eventId === undefined) {
      const betsRows = yield* persistenceQuery(
        "getRanking.totalBets",
        database.select({ count: sql<number>`count(*)` }).from(heroBet)
      );
      totalBets = yield* decodePersisted(
        PersistedAggregateNumber,
        betsRows[0]?.count ?? 0,
        "getRanking.decode"
      );
    } else {
      const betsRows = yield* persistenceQuery(
        "getRanking.totalEventBets",
        database
          .select({ count: sql<number>`count(*)` })
          .from(heroBet)
          .innerJoin(hero, eq(heroBet.heroId, hero.id))
          .where(eq(hero.eventId, input.eventId))
      );
      totalBets = yield* decodePersisted(
        PersistedAggregateNumber,
        betsRows[0]?.count ?? 0,
        "getRanking.decode"
      );
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
        : yield* decodePointWorth(
            pointWorthRows[0]?.pointWorth ?? null,
            "getRanking.decode"
          );

    return {
      pointWorth,
      ranking: yield* Effect.all(ranking.map(normalizeRankingRow)),
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
