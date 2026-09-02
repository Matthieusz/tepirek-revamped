/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, heroBet, userStats } from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const PersistedAggregateNumber = Schema.Union([
  Schema.Finite,
  Schema.FiniteFromString,
]);
const directPersistenceQuery = makeDirectPersistenceQuery(
  ({ cause, operation }) =>
    new RankingPersistenceUnavailable({ cause, operation })
);
const persistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) => directPersistenceQuery(operation, self);

const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A>,
  operation: string
) =>
  decodePersistedValue(
    schema,
    operation,
    ({ cause, operation: failedOperation }) =>
      new RankingPersistenceUnavailable({ cause, operation: failedOperation })
  );

const decodePointWorth = (operation: string) => {
  const decode = parsePointWorth;
  return (input: Parameters<typeof decode>[0]) =>
    decode(input).pipe(
      Effect.mapError(
        (cause) => new RankingPersistenceUnavailable({ cause, operation })
      )
    );
};

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
      "getRanking.decode"
    )(row.totalBets);
    const userId = yield* decodePersisted(
      AppUserId,
      "getRanking.decode"
    )(row.userId);
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
      "getHeroStats.decode"
    )(heroId);
    const totalBets = yield* decodePersisted(
      PersistedAggregateNumber,
      "getHeroStats.decode"
    )(stats?.totalBets ?? 0);
    const totalPoints = yield* decodePersisted(
      Schema.FiniteFromString,
      "getHeroStats.decode"
    )(stats?.totalPoints ?? "0");
    const currentPointWorth = yield* decodePointWorth("getHeroStats.decode")(
      heroInfo.pointWorth
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
    const eligibleUsers = database
      .select({ eventId: userStats.eventId })
      .from(userStats)
      .groupBy(userStats.eventId, userStats.userId)
      .having(
        sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS} AND NOT BOOL_AND(${userStats.paidOut})`
      )
      .as("eligible_users");
    const result = yield* persistenceQuery(
      "getOldestUnpaidEvent",
      database
        .select({ eventId: event.id })
        .from(eligibleUsers)
        .innerJoin(event, eq(eligibleUsers.eventId, event.id))
        .groupBy(event.id, event.endTime)
        .orderBy(asc(event.endTime), asc(event.id))
        .limit(1)
    );
    const eventId = result[0]?.eventId;
    return eventId === undefined
      ? null
      : yield* decodePersisted(EventId, "getOldestUnpaidEvent.decode")(eventId);
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

    let totalBetsRows: readonly { count: number }[];
    if (input.heroId !== undefined) {
      totalBetsRows = yield* persistenceQuery(
        "getRanking.totalHeroBets",
        database
          .select({ count: sql<number>`count(*)` })
          .from(heroBet)
          .where(eq(heroBet.heroId, input.heroId))
      );
    } else if (input.eventId === undefined) {
      totalBetsRows = yield* persistenceQuery(
        "getRanking.totalBets",
        database.select({ count: sql<number>`count(*)` }).from(heroBet)
      );
    } else {
      totalBetsRows = yield* persistenceQuery(
        "getRanking.totalEventBets",
        database
          .select({ count: sql<number>`count(*)` })
          .from(heroBet)
          .innerJoin(hero, eq(heroBet.heroId, hero.id))
          .where(eq(hero.eventId, input.eventId))
      );
    }
    const totalBets = yield* decodePersisted(
      PersistedAggregateNumber,
      "getRanking.decode"
    )(totalBetsRows[0]?.count ?? 0);

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
        : yield* decodePointWorth("getRanking.decode")(
            pointWorthRows[0]?.pointWorth ?? null
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

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const DrizzleRankingServiceLayer: Layer.Layer<
  RankingService,
  never,
  EffectDatabase
> = Layer.effect(
  RankingService,
  getDatabaseSync((database) => RankingService.of(makeService(database)))
);
