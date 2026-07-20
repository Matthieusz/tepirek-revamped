/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { BetId, EventId, HeroId } from "../../domain/core-identifiers.ts";
import {
  calculatePointsPerMember,
  parsePointWorth,
} from "../../domain/hero-bet-ledger/points.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  BetBadRequest,
  BetNotFound,
  BetPersistenceUnavailable,
} from "../../services/bet/bet-errors.ts";
import type {
  BetServiceInterface,
  CreateBetInput,
  EditBetInput,
  GetPaginatedBetsInput,
} from "../../services/bet/bet-service.ts";
import { BetService } from "../../services/bet/bet-service.ts";
import { lockHeroLedger } from "./hero-ledger-lock.ts";
import { mapPersistenceErrors } from "./persistence-query.ts";
import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "./persistence-query.ts";

const persistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) =>
  mapPersistenceErrors(
    operation,
    self,
    (cause, failedOperation) =>
      new BetPersistenceUnavailable({
        cause,
        operation: failedOperation,
      })
  );

const toBetMember = (member: {
  readonly heroBetId: number;
  readonly points: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}) => ({
  ...member,
  heroBetId: BetId.make(member.heroBetId),
  userId: AppUserId.make(member.userId),
});

const toBetSummary = <
  T extends {
    readonly createdBy: string;
    readonly eventId: number;
    readonly heroId: number;
    readonly id: number;
    readonly members: readonly {
      readonly heroBetId: number;
      readonly points: string;
      readonly userId: string;
      readonly userImage: string | null;
      readonly userName: string | null;
    }[];
  },
>(
  bet: T
) => ({
  ...bet,
  createdBy: AppUserId.make(bet.createdBy),
  eventId: EventId.make(bet.eventId),
  heroId: HeroId.make(bet.heroId),
  id: BetId.make(bet.id),
  members: bet.members.map(toBetMember),
});

const getHeroEventWithDatabase = (database: Pick<EffectPgDatabase, "select">) =>
  Effect.fnUntraced(function* getHeroEvent(heroId: number, message: string) {
    const rows = yield* persistenceQuery(
      "getHeroEvent",
      database
        .select({ eventId: hero.eventId, name: hero.name })
        .from(hero)
        .where(eq(hero.id, heroId))
    );
    const [heroData] = rows;
    if (heroData === undefined) {
      return yield* new BetNotFound({ message });
    }
    return heroData;
  });

const validateVerifiedMemberIdsWithDatabase = (
  database: Pick<EffectPgDatabase, "select">
) =>
  Effect.fnUntraced(function* validateVerifiedMemberIds(
    userIds: readonly string[]
  ) {
    if (userIds.some((userId) => userId === "")) {
      return yield* new BetBadRequest({
        message: "Wybierz tylko zweryfikowanych graczy",
      });
    }
    const uniqueUserIds = Arr.dedupe(userIds);
    if (uniqueUserIds.length !== userIds.length) {
      return yield* new BetBadRequest({
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
      return yield* new BetBadRequest({
        message: "Wybierz tylko zweryfikowanych graczy",
      });
    }
    return uniqueUserIds;
  });

const attachMembersToBetsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* attachMembersToBets<
    T extends { readonly id: number },
  >(bets: readonly T[]) {
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
    const membersByBetId = Arr.groupBy(allMembers, (member) =>
      String(member.heroBetId)
    );
    return bets.map((bet) => ({
      ...bet,
      members: membersByBetId[String(bet.id)] ?? [],
    }));
  });

const refreshEarningsForHero = Effect.fnUntraced(
  function* refreshEarningsForHero(tx: TransactionDatabase, heroId: number) {
    const rows = yield* tx
      .select({ pointWorth: hero.pointWorth })
      .from(hero)
      .where(eq(hero.id, heroId));
    const [heroRow] = rows;
    if (
      heroRow === undefined ||
      (parsePointWorth(heroRow.pointWorth) ?? 0) <= 0
    ) {
      return;
    }
    yield* tx
      .update(userStats)
      .set({
        earnings: sql`ROUND((${userStats.points}) * ${heroRow.pointWorth}, 2)`,
      })
      .where(eq(userStats.heroId, heroId));
  }
);

const createBetWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createBet({
    createdAt,
    createdBy,
    heroId,
    userIds,
  }: CreateBetInput) {
    return yield* persistenceQuery(
      "createBet",
      database.transaction(
        Effect.fnUntraced(function* createBetTransaction(
          tx: TransactionDatabase
        ) {
          yield* lockHeroLedger(tx, heroId);
          const memberUserIds =
            yield* validateVerifiedMemberIdsWithDatabase(tx)(userIds);
          const memberCount = memberUserIds.length;
          const pointsPerMember = calculatePointsPerMember(memberCount);
          const heroData = yield* getHeroEventWithDatabase(tx)(
            heroId,
            "Nie znaleziono herosów"
          );
          const insertedBets = yield* tx
            .insert(heroBet)
            .values({
              createdAt,
              createdBy,
              heroId,
              memberCount,
            })
            .returning();
          const [bet] = insertedBets;
          if (bet === undefined) {
            return yield* new BetBadRequest({
              message: "Nie udało się utworzyć obstawienia",
            });
          }
          yield* tx.insert(heroBetMember).values(
            memberUserIds.map((userId) => ({
              heroBetId: bet.id,
              points: pointsPerMember,
              userId,
            }))
          );
          yield* tx
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
              target: [userStats.userId, userStats.eventId, userStats.heroId],
            });
          yield* refreshEarningsForHero(tx, heroId);
          return {
            ...bet,
            createdBy: AppUserId.make(bet.createdBy),
            heroId: HeroId.make(bet.heroId),
            id: BetId.make(bet.id),
          };
        })
      )
    );
  });

const deleteBetWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* deleteBet(id: number) {
    const betRows = yield* persistenceQuery(
      "deleteBet.loadBet",
      database
        .select({ heroId: heroBet.heroId })
        .from(heroBet)
        .where(eq(heroBet.id, id))
    );
    const [betData] = betRows;
    if (betData === undefined) {
      return yield* new BetNotFound({ message: "Obstawienie nie znalezione" });
    }

    yield* persistenceQuery(
      "deleteBet",
      database.transaction(
        Effect.fnUntraced(function* deleteBetTransaction(
          tx: TransactionDatabase
        ) {
          yield* lockHeroLedger(tx, betData.heroId);
          const currentBetRows = yield* tx
            .select({ heroId: heroBet.heroId })
            .from(heroBet)
            .where(eq(heroBet.id, id));
          const [currentBet] = currentBetRows;
          if (currentBet === undefined) {
            return yield* new BetNotFound({
              message: "Obstawienie nie znalezione",
            });
          }
          const heroData = yield* getHeroEventWithDatabase(tx)(
            currentBet.heroId,
            "Heros nie znaleziony"
          );
          const members = yield* tx
            .select({ userId: heroBetMember.userId })
            .from(heroBetMember)
            .where(eq(heroBetMember.heroBetId, id));
          const memberUserIds = Arr.dedupe(
            members.map((member) => member.userId)
          );
          if (memberUserIds.length > 0) {
            yield* tx
              .update(userStats)
              .set({
                bets: sql`${userStats.bets} - 1`,
                points: sql`${userStats.points} - COALESCE((SELECT ${heroBetMember.points} FROM ${heroBetMember} WHERE ${heroBetMember.heroBetId} = ${id} AND ${heroBetMember.userId} = ${userStats.userId} LIMIT 1), 0)`,
              })
              .where(
                and(
                  eq(userStats.eventId, heroData.eventId),
                  eq(userStats.heroId, currentBet.heroId),
                  inArray(userStats.userId, memberUserIds)
                )
              );
          }
          yield* tx.delete(heroBet).where(eq(heroBet.id, id));
          yield* refreshEarningsForHero(tx, currentBet.heroId);
        })
      )
    );
    return { success: true } as const;
  });

const editBetWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* editBet({ betId, newUserIds }: EditBetInput) {
    const betRows = yield* persistenceQuery(
      "editBet.loadBet",
      database
        .select({ heroId: heroBet.heroId })
        .from(heroBet)
        .where(eq(heroBet.id, betId))
    );
    const [betData] = betRows;
    if (betData === undefined) {
      return yield* new BetNotFound({
        message: "Obstawienie nie znalezione",
      });
    }

    yield* persistenceQuery(
      "editBet",
      database.transaction(
        Effect.fnUntraced(function* editBetTransaction(
          tx: TransactionDatabase
        ) {
          yield* lockHeroLedger(tx, betData.heroId);
          const currentBetRows = yield* tx
            .select({ heroId: heroBet.heroId })
            .from(heroBet)
            .where(eq(heroBet.id, betId));
          const [currentBet] = currentBetRows;
          if (currentBet === undefined) {
            return yield* new BetNotFound({
              message: "Obstawienie nie znalezione",
            });
          }
          const memberUserIds =
            yield* validateVerifiedMemberIdsWithDatabase(tx)(newUserIds);
          const newMemberCount = memberUserIds.length;
          const heroData = yield* getHeroEventWithDatabase(tx)(
            currentBet.heroId,
            "Heros nie znaleziony"
          );
          const currentMembers = yield* tx
            .select({
              points: heroBetMember.points,
              userId: heroBetMember.userId,
            })
            .from(heroBetMember)
            .where(eq(heroBetMember.heroBetId, betId));
          const currentMemberIds = HashSet.fromIterable(
            currentMembers.map((member) => member.userId)
          );
          if (currentMembers.length === 0) {
            return yield* new BetBadRequest({
              message: "Obstawienie nie ma członków",
            });
          }
          const oldPointsPerMember = Schema.decodeUnknownSync(
            Schema.NumberFromString
          )(currentMembers[0]?.points ?? "0");
          const newPointsPerMember = calculatePointsPerMember(newMemberCount);
          const membersToRemove = currentMembers.filter(
            (member) => !memberUserIds.includes(member.userId)
          );
          const membersToAdd = memberUserIds.filter(
            (userId) => !HashSet.has(currentMemberIds, userId)
          );
          const membersToKeep = currentMembers.filter((member) =>
            memberUserIds.includes(member.userId)
          );
          if (membersToRemove.length > 0) {
            const removeUserIds = membersToRemove.map(
              (member) => member.userId
            );
            yield* tx
              .update(userStats)
              .set({
                bets: sql`${userStats.bets} - 1`,
                points: sql`${userStats.points} - COALESCE((SELECT ${heroBetMember.points} FROM ${heroBetMember} WHERE ${heroBetMember.heroBetId} = ${betId} AND ${heroBetMember.userId} = ${userStats.userId} LIMIT 1), 0)`,
              })
              .where(
                and(
                  eq(userStats.eventId, heroData.eventId),
                  eq(userStats.heroId, currentBet.heroId),
                  inArray(userStats.userId, removeUserIds)
                )
              );
            yield* tx
              .delete(heroBetMember)
              .where(
                and(
                  eq(heroBetMember.heroBetId, betId),
                  inArray(heroBetMember.userId, removeUserIds)
                )
              );
          }
          if (membersToAdd.length > 0) {
            yield* tx.insert(heroBetMember).values(
              membersToAdd.map((userId) => ({
                heroBetId: betId,
                points: newPointsPerMember,
                userId,
              }))
            );
            yield* tx
              .insert(userStats)
              .values(
                membersToAdd.map((userId) => ({
                  bets: 1,
                  earnings: "0",
                  eventId: heroData.eventId,
                  heroId: currentBet.heroId,
                  points: newPointsPerMember,
                  userId,
                }))
              )
              .onConflictDoUpdate({
                set: {
                  bets: sql`${userStats.bets} + 1`,
                  points: sql`${userStats.points} + ${newPointsPerMember}`,
                },
                target: [userStats.userId, userStats.eventId, userStats.heroId],
              });
          }
          if (membersToKeep.length > 0) {
            const keepUserIds = membersToKeep.map((member) => member.userId);
            const pointsDiff =
              Schema.decodeUnknownSync(Schema.NumberFromString)(
                newPointsPerMember
              ) - oldPointsPerMember;
            yield* tx
              .update(heroBetMember)
              .set({ points: newPointsPerMember })
              .where(
                and(
                  eq(heroBetMember.heroBetId, betId),
                  inArray(heroBetMember.userId, keepUserIds)
                )
              );
            if (pointsDiff !== 0) {
              yield* tx
                .update(userStats)
                .set({
                  points: sql`${userStats.points} + ${pointsDiff.toFixed(2)}`,
                })
                .where(
                  and(
                    eq(userStats.eventId, heroData.eventId),
                    eq(userStats.heroId, currentBet.heroId),
                    inArray(userStats.userId, keepUserIds)
                  )
                );
            }
          }
          yield* tx
            .update(heroBet)
            .set({ memberCount: newMemberCount })
            .where(eq(heroBet.id, betId));
          yield* refreshEarningsForHero(tx, currentBet.heroId);
        })
      )
    );
    return { success: true } as const;
  });

const getAllBetsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getAllBets() {
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
        .orderBy(desc(heroBet.createdAt), desc(heroBet.id))
    );
    return (yield* attachMembersToBetsWithDatabase(database)(bets)).map(
      toBetSummary
    );
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
    ).pipe(
      Effect.map((rows) =>
        rows.map((row) => ({ ...row, userId: AppUserId.make(row.userId) }))
      )
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
        .orderBy(desc(heroBet.createdAt), desc(heroBet.id))
    ).pipe(
      Effect.map((rows) =>
        rows.map((row) => ({
          ...row,
          createdBy: AppUserId.make(row.createdBy),
          eventId: EventId.make(row.eventId),
          heroId: HeroId.make(row.heroId),
          id: BetId.make(row.id),
        }))
      )
    );

const getLatestBetForCopyWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getLatestBetForCopy() {
    const latestRows = yield* persistenceQuery(
      "getLatestBetForCopy",
      database
        .select({ id: heroBet.id })
        .from(heroBet)
        .orderBy(desc(heroBet.createdAt), desc(heroBet.id))
        .limit(1)
    );
    const [latestBet] = latestRows;
    if (latestBet === undefined) {
      return null;
    }
    const [withMembers] = yield* attachMembersToBetsWithDatabase(database)([
      latestBet,
    ]);
    return withMembers === undefined
      ? null
      : {
          id: BetId.make(withMembers.id),
          members: withMembers.members.map(toBetMember),
        };
  });

const getPaginatedBetsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getPaginatedBets({
    page,
    limit,
    eventId,
    heroId,
  }: GetPaginatedBetsInput) {
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (eventId !== undefined) {
      conditions.push(eq(hero.eventId, eventId));
    }
    if (heroId !== undefined) {
      conditions.push(eq(heroBet.heroId, heroId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
        .orderBy(desc(heroBet.createdAt), desc(heroBet.id))
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
    const totalItems = Schema.decodeUnknownSync(
      Schema.Union([Schema.Number, Schema.NumberFromString])
    )(countRows[0]?.count ?? 0);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: (yield* attachMembersToBetsWithDatabase(database)(bets)).map(
        toBetSummary
      ),
      pagination: {
        hasMore: page < totalPages,
        limit,
        page,
        totalItems,
        totalPages,
      },
    };
  });

const makeService = (database: EffectPgDatabase): BetServiceInterface => ({
  createBet: Effect.fn("BetService.createBet")(createBetWithDatabase(database)),
  deleteBet: Effect.fn("BetService.deleteBet")(deleteBetWithDatabase(database)),
  editBet: Effect.fn("BetService.editBet")(editBetWithDatabase(database)),
  getAllBets: Effect.fn("BetService.getAllBets")(
    getAllBetsWithDatabase(database)
  ),
  getBetMembers: Effect.fn("BetService.getBetMembers")((betId: number) =>
    getBetMembersWithDatabase(database)(betId)
  ),
  getBetsByEvent: Effect.fn("BetService.getBetsByEvent")((eventId: number) =>
    getBetsByEventWithDatabase(database)(eventId)
  ),
  getLatestBetForCopy: Effect.fn("BetService.getLatestBetForCopy")(
    getLatestBetForCopyWithDatabase(database)
  ),
  getPaginatedBets: Effect.fn("BetService.getPaginatedBets")(
    (input: GetPaginatedBetsInput) =>
      getPaginatedBetsWithDatabase(database)(input)
  ),
});

export const DrizzleBetServiceLayer: Layer.Layer<
  BetService,
  never,
  EffectDatabase
> = Layer.effect(
  BetService,
  EffectDatabase.useSync((database) => BetService.of(makeService(database)))
);
