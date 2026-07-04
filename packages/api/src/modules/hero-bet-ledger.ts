import { MIN_EARNINGS, POINTS_PER_HERO } from "@tepirek-revamped/config";
import { db } from "@tepirek-revamped/db";
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

import { AppError } from "./app-error.js";

const calculatePointsPerMember = (memberCount: number) =>
  (Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100).toFixed(2);

const parsePointWorth = (pointWorth: number | string | null) =>
  pointWorth === null ? null : Number(pointWorth);

const getHeroEvent = async (heroId: number, message: string) => {
  const [heroData] = await db
    .select({ eventId: hero.eventId, name: hero.name })
    .from(hero)
    .where(eq(hero.id, heroId));

  if (!heroData) {
    throw new AppError("NOT_FOUND", { message });
  }

  return heroData;
};

const validateVerifiedMemberIds = async (userIds: string[]) => {
  if (userIds.some((userId) => userId === "")) {
    throw new AppError("BAD_REQUEST", {
      message: "Wybierz tylko zweryfikowanych graczy",
    });
  }

  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length !== userIds.length) {
    throw new AppError("BAD_REQUEST", {
      message: "Ten sam gracz nie może być wybrany dwa razy",
    });
  }

  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, uniqueUserIds), eq(user.verified, true)));

  if (rows.length !== uniqueUserIds.length) {
    throw new AppError("BAD_REQUEST", {
      message: "Wybierz tylko zweryfikowanych graczy",
    });
  }

  return uniqueUserIds;
};

const buildUserStatsWhere = (input: {
  eventId?: number | undefined;
  heroId?: number | undefined;
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

const attachMembersToBets = async <T extends { id: number }>(bets: T[]) => {
  const betIds = bets.map((bet) => bet.id);
  const allMembers =
    betIds.length > 0
      ? await db
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
};

/**
 * Recompute `userStats.earnings` for a hero after a bet mutation changes
 * member points. Earnings only have meaning once gold has been distributed
 * (i.e. `hero.pointWorth > 0`); before that, earnings stay at "0". Keeping
 * this in sync prevents the vault screen from showing payouts that no longer
 * match the bet ledger after an admin edits or deletes a distributed bet.
 */
const refreshEarningsForHero = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  heroId: number
) => {
  const [heroRow] = await tx
    .select({ pointWorth: hero.pointWorth })
    .from(hero)
    .where(eq(hero.id, heroId));

  if (!heroRow || Number(heroRow.pointWorth) <= 0) {
    return;
  }

  await tx
    .update(userStats)
    .set({
      earnings: sql`ROUND((${userStats.points}) * ${heroRow.pointWorth}, 2)`,
    })
    .where(eq(userStats.heroId, heroId));
};

export const heroBetLedger = {
  async createBet(input: {
    createdBy: string;
    heroId: number;
    userIds: string[];
  }) {
    const { createdBy, heroId, userIds } = input;
    const memberUserIds = await validateVerifiedMemberIds(userIds);
    const memberCount = memberUserIds.length;
    const pointsPerMember = calculatePointsPerMember(memberCount);
    const heroData = await getHeroEvent(heroId, "Nie znaleziono herosów");

    return db.transaction(async (tx) => {
      const [bet] = await tx
        .insert(heroBet)
        .values({
          createdAt: new Date(),
          createdBy,
          heroId,
          memberCount,
        })
        .returning();

      if (!bet) {
        throw new AppError("INTERNAL_SERVER_ERROR", {
          message: "Nie udało się utworzyć obstawienia",
        });
      }

      await tx.insert(heroBetMember).values(
        memberUserIds.map((userId) => ({
          heroBetId: bet.id,
          points: pointsPerMember,
          userId,
        }))
      );

      await tx
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

      await refreshEarningsForHero(tx, heroId);

      return bet;
    });
  },

  async deleteBet(id: number) {
    const [betData] = await db
      .select({ heroId: heroBet.heroId, memberCount: heroBet.memberCount })
      .from(heroBet)
      .where(eq(heroBet.id, id));

    if (!betData) {
      throw new AppError("NOT_FOUND", {
        message: "Obstawienie nie znalezione",
      });
    }

    const heroData = await getHeroEvent(betData.heroId, "Heros nie znaleziony");
    const members = await db
      .select({ userId: heroBetMember.userId })
      .from(heroBetMember)
      .where(eq(heroBetMember.heroBetId, id));
    const memberUserIds = [...new Set(members.map((member) => member.userId))];

    await db.transaction(async (tx) => {
      if (memberUserIds.length > 0) {
        await tx
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
          );
      }

      await tx.delete(heroBet).where(eq(heroBet.id, id));

      await refreshEarningsForHero(tx, betData.heroId);
    });

    return { success: true };
  },

  async distributeGold(input: { goldAmount: number; heroId: number }) {
    const { heroId, goldAmount } = input;
    const heroData = await getHeroEvent(heroId, "Heros nie znaleziony");
    const heroUserStats = await db
      .select({
        id: userStats.id,
        points: userStats.points,
        userId: userStats.userId,
      })
      .from(userStats)
      .where(eq(userStats.heroId, heroId));

    if (heroUserStats.length === 0) {
      throw new AppError("BAD_REQUEST", {
        message: "Brak obstawień dla tego herosa",
      });
    }

    const totalPoints = heroUserStats.reduce(
      (sum, stat) => sum + Number.parseFloat(stat.points),
      0
    );

    if (totalPoints <= 0) {
      throw new AppError("BAD_REQUEST", {
        message: "Suma punktów musi być większa od zera",
      });
    }

    const pointWorth = goldAmount / totalPoints;
    const storedPointWorth = pointWorth.toFixed(6);
    await db.transaction(async (tx) => {
      await tx
        .update(userStats)
        .set({
          earnings: sql`ROUND((${userStats.points}) * ${storedPointWorth}, 2)`,
        })
        .where(eq(userStats.heroId, heroId));
      await tx
        .update(hero)
        .set({ pointWorth: storedPointWorth })
        .where(eq(hero.id, heroId));
    });

    return {
      goldAmount,
      heroId,
      heroName: heroData.name,
      pointWorth: Number(storedPointWorth),
      success: true,
      totalPoints,
      usersUpdated: heroUserStats.length,
    };
  },

  async editBet(input: { betId: number; newUserIds: string[] }) {
    const { betId, newUserIds } = input;
    const memberUserIds = await validateVerifiedMemberIds(newUserIds);
    const newMemberCount = memberUserIds.length;
    const [betData] = await db
      .select({ heroId: heroBet.heroId, memberCount: heroBet.memberCount })
      .from(heroBet)
      .where(eq(heroBet.id, betId));

    if (!betData) {
      throw new AppError("NOT_FOUND", {
        message: "Obstawienie nie znalezione",
      });
    }

    const heroData = await getHeroEvent(betData.heroId, "Heros nie znaleziony");
    const currentMembers = await db
      .select({ points: heroBetMember.points, userId: heroBetMember.userId })
      .from(heroBetMember)
      .where(eq(heroBetMember.heroBetId, betId));
    const currentMemberIds = new Set(
      currentMembers.map((member) => member.userId)
    );

    if (currentMembers.length === 0) {
      throw new AppError("INTERNAL_SERVER_ERROR", {
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

    await db.transaction(async (tx) => {
      if (membersToRemove.length > 0) {
        const removeUserIds = membersToRemove.map((member) => member.userId);
        await tx
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
          );

        await tx
          .delete(heroBetMember)
          .where(
            and(
              eq(heroBetMember.heroBetId, betId),
              inArray(heroBetMember.userId, removeUserIds)
            )
          );
      }

      if (membersToAdd.length > 0) {
        await tx.insert(heroBetMember).values(
          membersToAdd.map((userId) => ({
            heroBetId: betId,
            points: newPointsPerMember,
            userId,
          }))
        );

        await tx
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
            target: [userStats.userId, userStats.eventId, userStats.heroId],
          });
      }

      if (membersToKeep.length > 0) {
        const keepUserIds = membersToKeep.map((member) => member.userId);
        const pointsDiff = Number(newPointsPerMember) - oldPointsPerMember;
        await tx
          .update(heroBetMember)
          .set({ points: newPointsPerMember })
          .where(
            and(
              eq(heroBetMember.heroBetId, betId),
              inArray(heroBetMember.userId, keepUserIds)
            )
          );

        if (pointsDiff !== 0) {
          await tx
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
            );
        }
      }

      await tx
        .update(heroBet)
        .set({ memberCount: newMemberCount })
        .where(eq(heroBet.id, betId));

      await refreshEarningsForHero(tx, betData.heroId);
    });

    return { success: true };
  },

  async getAllBets() {
    const bets = await db
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
      .orderBy(desc(heroBet.createdAt));

    return attachMembersToBets(bets);
  },

  getBetMembers(betId: number) {
    return db
      .select({
        id: heroBetMember.id,
        points: heroBetMember.points,
        userId: heroBetMember.userId,
      })
      .from(heroBetMember)
      .where(eq(heroBetMember.heroBetId, betId));
  },

  getBetsByEvent(eventId: number) {
    return db
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
      .where(eq(hero.eventId, eventId));
  },

  async getHeroStats(heroId: number) {
    const [stats] = await db
      .select({
        totalBets: sql<number>`COALESCE(SUM(${userStats.bets}), 0)`.as(
          "total_bets"
        ),
        totalPoints: sql<string>`COALESCE(SUM(${userStats.points}), '0')`.as(
          "total_points"
        ),
      })
      .from(userStats)
      .where(eq(userStats.heroId, heroId));

    const [heroInfo] = await db
      .select({ id: hero.id, name: hero.name, pointWorth: hero.pointWorth })
      .from(hero)
      .where(eq(hero.id, heroId));

    if (!heroInfo) {
      throw new AppError("NOT_FOUND", { message: "Heros nie znaleziony" });
    }

    return {
      currentPointWorth: Number(heroInfo.pointWorth),
      heroId,
      heroName: heroInfo.name,
      totalBets: Number(stats?.totalBets ?? 0),
      totalPoints: Number.parseFloat(stats?.totalPoints ?? "0"),
    };
  },

  async getLatestBetForCopy() {
    const [latestBet] = await db
      .select({ id: heroBet.id })
      .from(heroBet)
      .orderBy(desc(heroBet.createdAt))
      .limit(1);

    if (!latestBet) {
      return null;
    }

    const [withMembers] = await attachMembersToBets([latestBet]);
    return withMembers ?? null;
  },

  async getOldestUnpaidEvent() {
    const result = await db
      .select({ eventId: userStats.eventId })
      .from(userStats)
      .innerJoin(event, eq(userStats.eventId, event.id))
      .where(eq(userStats.paidOut, false))
      .groupBy(userStats.eventId, event.endTime)
      .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
      .orderBy(sql`${event.endTime} ASC`)
      .limit(1);

    return result[0]?.eventId ?? null;
  },

  async getPaginatedBets(input: {
    eventId?: number | undefined;
    heroId?: number | undefined;
    limit: number;
    page: number;
  }) {
    const { page, limit, eventId, heroId } = input;
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];
    if (eventId !== undefined) {
      conditions.push(eq(hero.eventId, eventId));
    }
    if (heroId !== undefined) {
      conditions.push(eq(heroBet.heroId, heroId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const bets = await db
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
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(heroBet)
      .innerJoin(hero, eq(heroBet.heroId, hero.id))
      .where(whereClause);

    const totalItems = Number(countResult?.count ?? 0);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: await attachMembersToBets(bets),
      pagination: {
        hasMore: page < totalPages,
        limit,
        page,
        totalItems,
        totalPages,
      },
    };
  },

  async getRanking(input: {
    eventId?: number | undefined;
    heroId?: number | undefined;
  }) {
    const whereClause = buildUserStatsWhere(input);
    const ranking = await db
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
      .orderBy(desc(sql`SUM(${userStats.points})`));

    let totalBets = 0;
    if (input.heroId !== undefined) {
      const [betsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(heroBet)
        .where(eq(heroBet.heroId, input.heroId));
      totalBets = Number(betsResult?.count ?? 0);
    } else if (input.eventId === undefined) {
      const [betsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(heroBet);
      totalBets = Number(betsResult?.count ?? 0);
    } else {
      const [betsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(eq(hero.eventId, input.eventId));
      totalBets = Number(betsResult?.count ?? 0);
    }

    const pointWorthRows =
      input.heroId === undefined
        ? null
        : await db
            .select({ pointWorth: hero.pointWorth })
            .from(hero)
            .where(eq(hero.id, input.heroId));
    const pointWorth =
      pointWorthRows === null
        ? null
        : parsePointWorth(pointWorthRows[0]?.pointWorth ?? null);

    return { pointWorth, ranking, totalBets };
  },

  getUserStats(eventId?: number) {
    if (eventId !== undefined) {
      return db.select().from(userStats).where(eq(userStats.eventId, eventId));
    }
    return db.select().from(userStats);
  },

  getVault(eventId?: number) {
    const whereClause = buildUserStatsWhere({ eventId });
    return db
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
      .orderBy(desc(sql`SUM(${userStats.earnings})`));
  },

  async togglePaidOut(input: {
    eventId: number;
    paidOut: boolean;
    userId: string;
  }) {
    const conditions: SQL[] = [
      eq(userStats.userId, input.userId),
      eq(userStats.eventId, input.eventId),
    ];

    await db
      .update(userStats)
      .set({ paidOut: input.paidOut })
      .where(and(...conditions));
    return { success: true };
  },
};
