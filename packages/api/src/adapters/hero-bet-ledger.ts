/* eslint-disable max-classes-per-file -- Collocated Effect service errors and tag keep this module migration atomic. */
/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { MIN_EARNINGS, POINTS_PER_HERO } from "@tepirek-revamped/config";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

export class HeroBetLedgerBadRequest extends Schema.TaggedErrorClass<HeroBetLedgerBadRequest>()(
  "HeroBetLedgerBadRequest",
  { message: Schema.String }
) {}

export class HeroBetLedgerNotFound extends Schema.TaggedErrorClass<HeroBetLedgerNotFound>()(
  "HeroBetLedgerNotFound",
  { message: Schema.String }
) {}

export class HeroBetLedgerInternalError extends Schema.TaggedErrorClass<HeroBetLedgerInternalError>()(
  "HeroBetLedgerInternalError",
  { message: Schema.String }
) {}

export class HeroBetLedgerPersistenceUnavailable extends Schema.TaggedErrorClass<HeroBetLedgerPersistenceUnavailable>()(
  "HeroBetLedgerPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type HeroBetLedgerError =
  | HeroBetLedgerBadRequest
  | HeroBetLedgerInternalError
  | HeroBetLedgerNotFound
  | HeroBetLedgerPersistenceUnavailable;

type TransactionDatabase = Parameters<
  Parameters<EffectPgDatabase["transaction"]>[0]
>[0];

export interface CreateBetInput {
  readonly createdBy: string;
  readonly heroId: number;
  readonly userIds: readonly string[];
}

export interface DistributeGoldInput {
  readonly goldAmount: number;
  readonly heroId: number;
}

export interface EditBetInput {
  readonly betId: number;
  readonly newUserIds: readonly string[];
}

export interface GetPaginatedBetsInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
  readonly limit: number;
  readonly page: number;
}

export interface GetRankingInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
}

export interface TogglePaidOutInput {
  readonly eventId: number;
  readonly paidOut: boolean;
  readonly userId: string;
}

const isHeroBetLedgerError = (cause: unknown): cause is HeroBetLedgerError =>
  typeof cause === "object" &&
  cause !== null &&
  "_tag" in cause &&
  (cause._tag === "HeroBetLedgerBadRequest" ||
    cause._tag === "HeroBetLedgerInternalError" ||
    cause._tag === "HeroBetLedgerNotFound" ||
    cause._tag === "HeroBetLedgerPersistenceUnavailable");

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown>
) =>
  self.pipe(
    Effect.mapError((cause) =>
      isHeroBetLedgerError(cause)
        ? cause
        : new HeroBetLedgerPersistenceUnavailable({ cause, operation })
    )
  );

const persistenceQueryUnsafe = <A>(self: Effect.Effect<A, unknown>) =>
  self as Effect.Effect<A, HeroBetLedgerPersistenceUnavailable>;

const calculatePointsPerMember = (memberCount: number) =>
  (Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100).toFixed(2);

const parsePointWorth = (pointWorth: number | string | null) =>
  pointWorth === null ? null : Number(pointWorth);

const getHeroEventWithDatabase =
  (database: EffectPgDatabase) => (heroId: number, message: string) =>
    Effect.gen(function* getHeroEvent() {
      const rows = yield* persistenceQuery(
        "getHeroEvent",
        database
          .select({ eventId: hero.eventId, name: hero.name })
          .from(hero)
          .where(eq(hero.id, heroId))
      );
      const [heroData] = rows;

      if (heroData === undefined) {
        return yield* new HeroBetLedgerNotFound({ message });
      }

      return heroData;
    });

const validateVerifiedMemberIdsWithDatabase =
  (database: EffectPgDatabase) => (userIds: readonly string[]) =>
    Effect.gen(function* validateVerifiedMemberIds() {
      if (userIds.some((userId) => userId === "")) {
        return yield* new HeroBetLedgerBadRequest({
          message: "Wybierz tylko zweryfikowanych graczy",
        });
      }

      const uniqueUserIds = [...new Set(userIds)];
      if (uniqueUserIds.length !== userIds.length) {
        return yield* new HeroBetLedgerBadRequest({
          message: "Ten sam gracz nie może być wybrany dwa razy",
        });
      }

      const rows = yield* persistenceQuery(
        "validateVerifiedMemberIds",
        database
          .select({ id: user.id })
          .from(user)
          .where(and(inArray(user.id, uniqueUserIds), eq(user.verified, true)))
      );

      if (rows.length !== uniqueUserIds.length) {
        return yield* new HeroBetLedgerBadRequest({
          message: "Wybierz tylko zweryfikowanych graczy",
        });
      }

      return uniqueUserIds;
    });

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

const attachMembersToBetsWithDatabase =
  (database: EffectPgDatabase) =>
  <T extends { readonly id: number }>(bets: readonly T[]) =>
    Effect.gen(function* attachMembersToBets() {
      const betIds = bets.map((bet) => bet.id);
      const allMembers =
        betIds.length > 0
          ? yield* persistenceQuery(
              "attachMembersToBets",
              database
                .select({
                  heroBetId: heroBetMember.heroBetId,
                  points: heroBetMember.points,
                  userId: heroBetMember.userId,
                  userImage: user.image,
                  userName: user.name,
                })
                .from(heroBetMember)
                .innerJoin(user, eq(heroBetMember.userId, user.id))
                .where(inArray(heroBetMember.heroBetId, betIds))
            )
          : [];

      const membersByBetId = new Map<number, (typeof allMembers)[number][]>();
      for (const member of allMembers) {
        const existing = membersByBetId.get(member.heroBetId) ?? [];
        existing.push(member);
        membersByBetId.set(member.heroBetId, existing);
      }

      return bets.map((bet) => ({
        ...bet,
        members: membersByBetId.get(bet.id) ?? [],
      }));
    });

const refreshEarningsForHero = (tx: TransactionDatabase, heroId: number) =>
  Effect.gen(function* refreshEarningsForHero() {
    const rows = yield* persistenceQueryUnsafe(
      tx
        .select({ pointWorth: hero.pointWorth })
        .from(hero)
        .where(eq(hero.id, heroId))
    );
    const [heroRow] = rows;

    if (heroRow === undefined || Number(heroRow.pointWorth) <= 0) {
      return;
    }

    yield* persistenceQueryUnsafe(
      tx
        .update(userStats)
        .set({
          earnings: sql`ROUND((${userStats.points}) * ${heroRow.pointWorth}, 2)`,
        })
        .where(eq(userStats.heroId, heroId))
    );
  });

const createBetWithDatabase =
  (database: EffectPgDatabase) =>
  ({ createdBy, heroId, userIds }: CreateBetInput) =>
    Effect.gen(function* createBet() {
      const memberUserIds =
        yield* validateVerifiedMemberIdsWithDatabase(database)(userIds);
      const memberCount = memberUserIds.length;
      const pointsPerMember = calculatePointsPerMember(memberCount);
      const heroData = yield* getHeroEventWithDatabase(database)(
        heroId,
        "Nie znaleziono herosów"
      );

      return yield* persistenceQuery(
        "createBet",
        database.transaction((tx) =>
          Effect.gen(function* createBetTransaction() {
            const insertedBets = yield* persistenceQueryUnsafe(
              tx
                .insert(heroBet)
                .values({
                  createdAt: new Date(),
                  createdBy,
                  heroId,
                  memberCount,
                })
                .returning()
            );
            const [bet] = insertedBets;

            if (bet === undefined) {
              return yield* new HeroBetLedgerInternalError({
                message: "Nie udało się utworzyć obstawienia",
              });
            }

            yield* persistenceQueryUnsafe(
              tx.insert(heroBetMember).values(
                memberUserIds.map((userId) => ({
                  heroBetId: bet.id,
                  points: pointsPerMember,
                  userId,
                }))
              )
            );

            yield* persistenceQueryUnsafe(
              tx
                .insert(userStats)
                .values(
                  memberUserIds.map((userId) => ({
                    bets: 1,
                    earnings: "0",
                    eventId: heroData.eventId,
                    heroId,
                    points: pointsPerMember,
                    userId,
                  }))
                )
                .onConflictDoUpdate({
                  set: {
                    bets: sql`${userStats.bets} + 1`,
                    points: sql`${userStats.points} + ${pointsPerMember}`,
                  },
                  target: [
                    userStats.userId,
                    userStats.eventId,
                    userStats.heroId,
                  ],
                })
            );

            yield* refreshEarningsForHero(tx, heroId);

            return bet;
          })
        )
      );
    });

const deleteBetWithDatabase = (database: EffectPgDatabase) => (id: number) =>
  Effect.gen(function* deleteBet() {
    const betRows = yield* persistenceQuery(
      "deleteBet.loadBet",
      database
        .select({ heroId: heroBet.heroId, memberCount: heroBet.memberCount })
        .from(heroBet)
        .where(eq(heroBet.id, id))
    );
    const [betData] = betRows;

    if (betData === undefined) {
      return yield* new HeroBetLedgerNotFound({
        message: "Obstawienie nie znalezione",
      });
    }

    const heroData = yield* getHeroEventWithDatabase(database)(
      betData.heroId,
      "Heros nie znaleziony"
    );
    const members = yield* persistenceQuery(
      "deleteBet.loadMembers",
      database
        .select({ userId: heroBetMember.userId })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, id))
    );
    const memberUserIds = [...new Set(members.map((member) => member.userId))];

    yield* persistenceQuery(
      "deleteBet",
      database.transaction((tx) =>
        Effect.gen(function* deleteBetTransaction() {
          if (memberUserIds.length > 0) {
            yield* persistenceQueryUnsafe(
              tx
                .update(userStats)
                .set({
                  bets: sql`${userStats.bets} - 1`,
                  points: sql`${userStats.points} - COALESCE((
              SELECT ${heroBetMember.points}
              FROM ${heroBetMember}
              WHERE ${heroBetMember.heroBetId} = ${id}
                AND ${heroBetMember.userId} = ${userStats.userId}
              LIMIT 1
            ), 0)`,
                })
                .where(
                  and(
                    eq(userStats.eventId, heroData.eventId),
                    eq(userStats.heroId, betData.heroId),
                    inArray(userStats.userId, memberUserIds)
                  )
                )
            );
          }

          yield* persistenceQueryUnsafe(
            tx.delete(heroBet).where(eq(heroBet.id, id))
          );
          yield* refreshEarningsForHero(tx, betData.heroId);
        })
      )
    );

    return { success: true } as const;
  });

const distributeGoldWithDatabase =
  (database: EffectPgDatabase) =>
  ({ goldAmount, heroId }: DistributeGoldInput) =>
    Effect.gen(function* distributeGold() {
      const heroData = yield* getHeroEventWithDatabase(database)(
        heroId,
        "Heros nie znaleziony"
      );
      const heroUserStats = yield* persistenceQuery(
        "distributeGold.loadStats",
        database
          .select({
            id: userStats.id,
            points: userStats.points,
            userId: userStats.userId,
          })
          .from(userStats)
          .where(eq(userStats.heroId, heroId))
      );

      if (heroUserStats.length === 0) {
        return yield* new HeroBetLedgerBadRequest({
          message: "Brak obstawień dla tego herosa",
        });
      }

      const totalPoints = heroUserStats.reduce(
        (sum, stat) => sum + Number.parseFloat(stat.points),
        0
      );

      if (totalPoints <= 0) {
        return yield* new HeroBetLedgerBadRequest({
          message: "Suma punktów musi być większa od zera",
        });
      }

      const pointWorth = goldAmount / totalPoints;
      const storedPointWorth = pointWorth.toFixed(6);
      yield* persistenceQuery(
        "distributeGold",
        database.transaction((tx) =>
          Effect.gen(function* distributeGoldTransaction() {
            yield* persistenceQueryUnsafe(
              tx
                .update(userStats)
                .set({
                  earnings: sql`ROUND((${userStats.points}) * ${storedPointWorth}, 2)`,
                })
                .where(eq(userStats.heroId, heroId))
            );
            yield* persistenceQueryUnsafe(
              tx
                .update(hero)
                .set({ pointWorth: storedPointWorth })
                .where(eq(hero.id, heroId))
            );
          })
        )
      );

      return {
        goldAmount,
        heroId,
        heroName: heroData.name,
        pointWorth: Number(storedPointWorth),
        success: true,
        totalPoints,
        usersUpdated: heroUserStats.length,
      };
    });

const editBetWithDatabase =
  (database: EffectPgDatabase) =>
  ({ betId, newUserIds }: EditBetInput) =>
    Effect.gen(function* editBet() {
      const memberUserIds =
        yield* validateVerifiedMemberIdsWithDatabase(database)(newUserIds);
      const newMemberCount = memberUserIds.length;
      const betRows = yield* persistenceQuery(
        "editBet.loadBet",
        database
          .select({ heroId: heroBet.heroId, memberCount: heroBet.memberCount })
          .from(heroBet)
          .where(eq(heroBet.id, betId))
      );
      const [betData] = betRows;

      if (betData === undefined) {
        return yield* new HeroBetLedgerNotFound({
          message: "Obstawienie nie znalezione",
        });
      }

      const heroData = yield* getHeroEventWithDatabase(database)(
        betData.heroId,
        "Heros nie znaleziony"
      );
      const currentMembers = yield* persistenceQuery(
        "editBet.loadMembers",
        database
          .select({
            points: heroBetMember.points,
            userId: heroBetMember.userId,
          })
          .from(heroBetMember)
          .where(eq(heroBetMember.heroBetId, betId))
      );
      const currentMemberIds = new Set(
        currentMembers.map((member) => member.userId)
      );

      if (currentMembers.length === 0) {
        return yield* new HeroBetLedgerInternalError({
          message: "Obstawienie nie ma członków",
        });
      }

      const oldPointsPerMember = Number.parseFloat(
        currentMembers[0]?.points ?? "0"
      );
      const newPointsPerMember = calculatePointsPerMember(newMemberCount);
      const membersToRemove = currentMembers.filter(
        (member) => !memberUserIds.includes(member.userId)
      );
      const membersToAdd = memberUserIds.filter(
        (id) => !currentMemberIds.has(id)
      );
      const membersToKeep = currentMembers.filter((member) =>
        memberUserIds.includes(member.userId)
      );

      yield* persistenceQuery(
        "editBet",
        database.transaction((tx) =>
          Effect.gen(function* editBetTransaction() {
            if (membersToRemove.length > 0) {
              const removeUserIds = membersToRemove.map(
                (member) => member.userId
              );
              yield* persistenceQueryUnsafe(
                tx
                  .update(userStats)
                  .set({
                    bets: sql`${userStats.bets} - 1`,
                    points: sql`${userStats.points} - COALESCE((
              SELECT ${heroBetMember.points}
              FROM ${heroBetMember}
              WHERE ${heroBetMember.heroBetId} = ${betId}
                AND ${heroBetMember.userId} = ${userStats.userId}
              LIMIT 1
            ), 0)`,
                  })
                  .where(
                    and(
                      eq(userStats.eventId, heroData.eventId),
                      eq(userStats.heroId, betData.heroId),
                      inArray(userStats.userId, removeUserIds)
                    )
                  )
              );

              yield* persistenceQueryUnsafe(
                tx
                  .delete(heroBetMember)
                  .where(
                    and(
                      eq(heroBetMember.heroBetId, betId),
                      inArray(heroBetMember.userId, removeUserIds)
                    )
                  )
              );
            }

            if (membersToAdd.length > 0) {
              yield* persistenceQueryUnsafe(
                tx.insert(heroBetMember).values(
                  membersToAdd.map((userId) => ({
                    heroBetId: betId,
                    points: newPointsPerMember,
                    userId,
                  }))
                )
              );

              yield* persistenceQueryUnsafe(
                tx
                  .insert(userStats)
                  .values(
                    membersToAdd.map((userId) => ({
                      bets: 1,
                      earnings: "0",
                      eventId: heroData.eventId,
                      heroId: betData.heroId,
                      points: newPointsPerMember,
                      userId,
                    }))
                  )
                  .onConflictDoUpdate({
                    set: {
                      bets: sql`${userStats.bets} + 1`,
                      points: sql`${userStats.points} + ${newPointsPerMember}`,
                    },
                    target: [
                      userStats.userId,
                      userStats.eventId,
                      userStats.heroId,
                    ],
                  })
              );
            }

            if (membersToKeep.length > 0) {
              const keepUserIds = membersToKeep.map((member) => member.userId);
              const pointsDiff =
                Number(newPointsPerMember) - oldPointsPerMember;
              yield* persistenceQueryUnsafe(
                tx
                  .update(heroBetMember)
                  .set({ points: newPointsPerMember })
                  .where(
                    and(
                      eq(heroBetMember.heroBetId, betId),
                      inArray(heroBetMember.userId, keepUserIds)
                    )
                  )
              );

              if (pointsDiff !== 0) {
                yield* persistenceQueryUnsafe(
                  tx
                    .update(userStats)
                    .set({
                      points: sql`${userStats.points} + ${pointsDiff.toFixed(2)}`,
                    })
                    .where(
                      and(
                        eq(userStats.eventId, heroData.eventId),
                        eq(userStats.heroId, betData.heroId),
                        inArray(userStats.userId, keepUserIds)
                      )
                    )
                );
              }
            }

            yield* persistenceQueryUnsafe(
              tx
                .update(heroBet)
                .set({ memberCount: newMemberCount })
                .where(eq(heroBet.id, betId))
            );

            yield* refreshEarningsForHero(tx, betData.heroId);
          })
        )
      );

      return { success: true } as const;
    });

const getAllBetsWithDatabase = (database: EffectPgDatabase) => () =>
  Effect.gen(function* getAllBets() {
    const bets = yield* persistenceQuery(
      "getAllBets",
      database
        .select({
          createdAt: heroBet.createdAt,
          createdBy: heroBet.createdBy,
          createdByImage: user.image,
          createdByName: user.name,
          eventId: hero.eventId,
          heroId: heroBet.heroId,
          heroImage: hero.image,
          heroName: hero.name,
          id: heroBet.id,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .innerJoin(user, eq(heroBet.createdBy, user.id))
        .orderBy(desc(heroBet.createdAt))
    );

    return yield* attachMembersToBetsWithDatabase(database)(bets);
  });

const getBetMembersWithDatabase =
  (database: EffectPgDatabase) => (betId: number) =>
    persistenceQuery(
      "getBetMembers",
      database
        .select({
          id: heroBetMember.id,
          points: heroBetMember.points,
          userId: heroBetMember.userId,
        })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, betId))
    );

const getBetsByEventWithDatabase =
  (database: EffectPgDatabase) => (eventId: number) =>
    persistenceQuery(
      "getBetsByEvent",
      database
        .select({
          createdAt: heroBet.createdAt,
          createdBy: heroBet.createdBy,
          eventId: hero.eventId,
          heroId: heroBet.heroId,
          heroName: hero.name,
          id: heroBet.id,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(eq(hero.eventId, eventId))
    );

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
        return yield* new HeroBetLedgerNotFound({
          message: "Heros nie znaleziony",
        });
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

const getLatestBetForCopyWithDatabase = (database: EffectPgDatabase) => () =>
  Effect.gen(function* getLatestBetForCopy() {
    const latestRows = yield* persistenceQuery(
      "getLatestBetForCopy",
      database
        .select({ id: heroBet.id })
        .from(heroBet)
        .orderBy(desc(heroBet.createdAt))
        .limit(1)
    );
    const [latestBet] = latestRows;

    if (latestBet === undefined) {
      return null;
    }

    const [withMembers] = yield* attachMembersToBetsWithDatabase(database)([
      latestBet,
    ]);
    return withMembers ?? null;
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

const getPaginatedBetsWithDatabase =
  (database: EffectPgDatabase) =>
  ({ page, limit, eventId, heroId }: GetPaginatedBetsInput) =>
    Effect.gen(function* getPaginatedBets() {
      const offset = (page - 1) * limit;
      const conditions: SQL[] = [];
      if (eventId !== undefined) {
        conditions.push(eq(hero.eventId, eventId));
      }
      if (heroId !== undefined) {
        conditions.push(eq(heroBet.heroId, heroId));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const bets = yield* persistenceQuery(
        "getPaginatedBets.items",
        database
          .select({
            createdAt: heroBet.createdAt,
            createdBy: heroBet.createdBy,
            createdByImage: user.image,
            createdByName: user.name,
            eventId: hero.eventId,
            heroId: heroBet.heroId,
            heroImage: hero.image,
            heroLevel: hero.level,
            heroName: hero.name,
            id: heroBet.id,
            memberCount: heroBet.memberCount,
          })
          .from(heroBet)
          .innerJoin(hero, eq(heroBet.heroId, hero.id))
          .innerJoin(user, eq(heroBet.createdBy, user.id))
          .where(whereClause)
          .orderBy(desc(heroBet.createdAt))
          .limit(limit)
          .offset(offset)
      );

      const countRows = yield* persistenceQuery(
        "getPaginatedBets.count",
        database
          .select({ count: sql<number>`count(*)` })
          .from(heroBet)
          .innerJoin(hero, eq(heroBet.heroId, hero.id))
          .where(whereClause)
      );

      const totalItems = Number(countRows[0]?.count ?? 0);
      const totalPages = Math.ceil(totalItems / limit);

      return {
        items: yield* attachMembersToBetsWithDatabase(database)(bets),
        pagination: {
          hasMore: page < totalPages,
          limit,
          page,
          totalItems,
          totalPages,
        },
      };
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

      return { pointWorth, ranking, totalBets };
    });

const getUserStatsWithDatabase =
  (database: EffectPgDatabase) => (eventId?: number) => {
    if (eventId !== undefined) {
      return persistenceQuery(
        "getUserStats",
        database.select().from(userStats).where(eq(userStats.eventId, eventId))
      );
    }
    return persistenceQuery("getUserStats", database.select().from(userStats));
  };

const getVaultWithDatabase =
  (database: EffectPgDatabase) => (eventId?: number) => {
    const whereClause = buildUserStatsWhere({ eventId });
    return persistenceQuery(
      "getVault",
      database
        .select({
          paidOut: sql<boolean>`BOOL_AND(${userStats.paidOut})`.as("paid_out"),
          totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
            "total_earnings"
          ),
          userId: userStats.userId,
          userImage: user.image,
          userName: user.name,
        })
        .from(userStats)
        .innerJoin(user, eq(userStats.userId, user.id))
        .where(whereClause)
        .groupBy(userStats.userId, user.name, user.image)
        .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
        .orderBy(desc(sql`SUM(${userStats.earnings})`))
    );
  };

const togglePaidOutWithDatabase =
  (database: EffectPgDatabase) => (input: TogglePaidOutInput) =>
    Effect.gen(function* togglePaidOut() {
      yield* persistenceQuery(
        "togglePaidOut",
        database
          .update(userStats)
          .set({ paidOut: input.paidOut })
          .where(
            and(
              eq(userStats.userId, input.userId),
              eq(userStats.eventId, input.eventId)
            )
          )
      );
      return { success: true } as const;
    });

export interface HeroBetLedgerService {
  readonly createBet: ReturnType<typeof createBetWithDatabase>;
  readonly deleteBet: ReturnType<typeof deleteBetWithDatabase>;
  readonly distributeGold: ReturnType<typeof distributeGoldWithDatabase>;
  readonly editBet: ReturnType<typeof editBetWithDatabase>;
  readonly getAllBets: ReturnType<typeof getAllBetsWithDatabase>;
  readonly getBetMembers: ReturnType<typeof getBetMembersWithDatabase>;
  readonly getBetsByEvent: ReturnType<typeof getBetsByEventWithDatabase>;
  readonly getHeroStats: ReturnType<typeof getHeroStatsWithDatabase>;
  readonly getLatestBetForCopy: ReturnType<
    typeof getLatestBetForCopyWithDatabase
  >;
  readonly getOldestUnpaidEvent: ReturnType<
    typeof getOldestUnpaidEventWithDatabase
  >;
  readonly getPaginatedBets: ReturnType<typeof getPaginatedBetsWithDatabase>;
  readonly getRanking: ReturnType<typeof getRankingWithDatabase>;
  readonly getUserStats: ReturnType<typeof getUserStatsWithDatabase>;
  readonly getVault: ReturnType<typeof getVaultWithDatabase>;
  readonly togglePaidOut: ReturnType<typeof togglePaidOutWithDatabase>;
}

export class HeroBetLedger extends Context.Service<
  HeroBetLedger,
  HeroBetLedgerService
>()("@tepirek-revamped/api/HeroBetLedger") {}

export const HeroBetLedgerLayer: Layer.Layer<
  HeroBetLedger,
  never,
  EffectDatabase
> = Layer.effect(
  HeroBetLedger,
  EffectDatabase.useSync((database) =>
    HeroBetLedger.of({
      createBet: Effect.fn("HeroBetLedger.createBet")(
        createBetWithDatabase(database)
      ),
      deleteBet: Effect.fn("HeroBetLedger.deleteBet")(
        deleteBetWithDatabase(database)
      ),
      distributeGold: Effect.fn("HeroBetLedger.distributeGold")(
        distributeGoldWithDatabase(database)
      ),
      editBet: Effect.fn("HeroBetLedger.editBet")(
        editBetWithDatabase(database)
      ),
      getAllBets: Effect.fn("HeroBetLedger.getAllBets")(
        getAllBetsWithDatabase(database)
      ),
      getBetMembers: Effect.fn("HeroBetLedger.getBetMembers")(
        getBetMembersWithDatabase(database)
      ),
      getBetsByEvent: Effect.fn("HeroBetLedger.getBetsByEvent")(
        getBetsByEventWithDatabase(database)
      ),
      getHeroStats: Effect.fn("HeroBetLedger.getHeroStats")(
        getHeroStatsWithDatabase(database)
      ),
      getLatestBetForCopy: Effect.fn("HeroBetLedger.getLatestBetForCopy")(
        getLatestBetForCopyWithDatabase(database)
      ),
      getOldestUnpaidEvent: Effect.fn("HeroBetLedger.getOldestUnpaidEvent")(
        getOldestUnpaidEventWithDatabase(database)
      ),
      getPaginatedBets: Effect.fn("HeroBetLedger.getPaginatedBets")(
        getPaginatedBetsWithDatabase(database)
      ),
      getRanking: Effect.fn("HeroBetLedger.getRanking")(
        getRankingWithDatabase(database)
      ),
      getUserStats: Effect.fn("HeroBetLedger.getUserStats")(
        getUserStatsWithDatabase(database)
      ),
      getVault: Effect.fn("HeroBetLedger.getVault")(
        getVaultWithDatabase(database)
      ),
      togglePaidOut: Effect.fn("HeroBetLedger.togglePaidOut")(
        togglePaidOutWithDatabase(database)
      ),
    })
  )
);
