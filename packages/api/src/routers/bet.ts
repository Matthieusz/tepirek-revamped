import { ORPCError } from "@orpc/server";
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
import z from "zod";
import { adminProcedure, protectedProcedure } from "../index";

const POINTS_PER_HERO = 20;

export const betRouter = {
  create: adminProcedure
    .input(
      z.object({
        heroId: z.number(),
        userIds: z.array(z.string()).min(1),
      })
    )
    .handler(async ({ input, context }) => {
      const { heroId, userIds } = input;
      const memberCount = userIds.length;
      const pointsPerMember = (
        Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100
      ).toFixed(2);

      // Get the hero to find the eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", { message: "Nie znaleziono herosów" });
      }

      // Create bet, members, and update stats in a transaction
      const newBet = await db.transaction(async (tx) => {
        // Create the bet
        const [bet] = await tx
          .insert(heroBet)
          .values({
            heroId,
            createdBy: context.session.user.id,
            memberCount,
            createdAt: new Date(),
          })
          .returning();

        if (!bet) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Nie udało się utworzyć obstawienia",
          });
        }

        // Create bet members
        await tx.insert(heroBetMember).values(
          userIds.map((userId) => ({
            heroBetId: bet.id,
            userId,
            points: pointsPerMember,
          }))
        );

        // Upsert userStats for each member
        for (const userId of userIds) {
          await tx
            .insert(userStats)
            .values({
              userId,
              eventId: heroData.eventId,
              heroId,
              points: pointsPerMember,
              bets: 1,
              earnings: "0",
            })
            .onConflictDoUpdate({
              target: [userStats.userId, userStats.eventId, userStats.heroId],
              set: {
                points: sql`${userStats.points} + ${pointsPerMember}`,
                bets: sql`${userStats.bets} + 1`,
              },
            });
        }

        return bet;
      });

      return newBet;
    }),

  getAll: protectedProcedure.handler(async () => {
    const bets = await db
      .select({
        id: heroBet.id,
        heroId: heroBet.heroId,
        heroName: hero.name,
        heroImage: hero.image,
        eventId: hero.eventId,
        createdBy: heroBet.createdBy,
        createdByName: user.name,
        createdByImage: user.image,
        memberCount: heroBet.memberCount,
        createdAt: heroBet.createdAt,
      })
      .from(heroBet)
      .innerJoin(hero, eq(heroBet.heroId, hero.id))
      .innerJoin(user, eq(heroBet.createdBy, user.id))
      .orderBy(desc(heroBet.createdAt));

    // Batch fetch all members in single query (avoid N+1)
    const betIds = bets.map((bet) => bet.id);
    const allMembers =
      betIds.length > 0
        ? await db
            .select({
              heroBetId: heroBetMember.heroBetId,
              userId: heroBetMember.userId,
              userName: user.name,
              userImage: user.image,
              points: heroBetMember.points,
            })
            .from(heroBetMember)
            .innerJoin(user, eq(heroBetMember.userId, user.id))
            .where(inArray(heroBetMember.heroBetId, betIds))
        : [];

    // Group members by bet ID
    const membersByBetId = new Map<number, (typeof allMembers)[number][]>();
    for (const member of allMembers) {
      const existing = membersByBetId.get(member.heroBetId) || [];
      existing.push(member);
      membersByBetId.set(member.heroBetId, existing);
    }

    // Combine bets with their members
    return bets.map((bet) => ({
      ...bet,
      members: membersByBetId.get(bet.id) || [],
    }));
  }),

  getAllPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
        eventId: z.number().optional(),
        heroId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      const { page, limit, eventId, heroId } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions: SQL[] = [];
      if (eventId) {
        conditions.push(eq(hero.eventId, eventId));
      }
      if (heroId) {
        conditions.push(eq(heroBet.heroId, heroId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get paginated bets
      const bets = await db
        .select({
          id: heroBet.id,
          heroId: heroBet.heroId,
          heroName: hero.name,
          heroImage: hero.image,
          heroLevel: hero.level,
          eventId: hero.eventId,
          createdBy: heroBet.createdBy,
          createdByName: user.name,
          createdByImage: user.image,
          memberCount: heroBet.memberCount,
          createdAt: heroBet.createdAt,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .innerJoin(user, eq(heroBet.createdBy, user.id))
        .where(whereClause)
        .orderBy(desc(heroBet.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(whereClause);

      const totalItems = Number(countResult?.count ?? 0);
      const totalPages = Math.ceil(totalItems / limit);

      // Batch fetch members for all bets in this page
      const betIds = bets.map((bet) => bet.id);
      const allMembers =
        betIds.length > 0
          ? await db
              .select({
                heroBetId: heroBetMember.heroBetId,
                userId: heroBetMember.userId,
                userName: user.name,
                userImage: user.image,
                points: heroBetMember.points,
              })
              .from(heroBetMember)
              .innerJoin(user, eq(heroBetMember.userId, user.id))
              .where(inArray(heroBetMember.heroBetId, betIds))
          : [];

      // Group members by bet ID
      const membersByBetId = new Map<number, (typeof allMembers)[number][]>();
      for (const member of allMembers) {
        const existing = membersByBetId.get(member.heroBetId) || [];
        existing.push(member);
        membersByBetId.set(member.heroBetId, existing);
      }

      // Combine bets with their members
      const betsWithMembers = bets.map((bet) => ({
        ...bet,
        members: membersByBetId.get(bet.id) || [],
      }));

      return {
        items: betsWithMembers,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    }),

  getByEvent: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .handler(async ({ input }) => {
      const bets = await db
        .select({
          id: heroBet.id,
          heroId: heroBet.heroId,
          heroName: hero.name,
          eventId: hero.eventId,
          createdBy: heroBet.createdBy,
          memberCount: heroBet.memberCount,
          createdAt: heroBet.createdAt,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(eq(hero.eventId, input.eventId));

      return bets;
    }),

  getBetMembers: protectedProcedure
    .input(z.object({ betId: z.number() }))
    .handler(async ({ input }) => {
      const members = await db
        .select({
          id: heroBetMember.id,
          userId: heroBetMember.userId,
          points: heroBetMember.points,
        })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, input.betId));

      return members;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      // Get bet details before deletion to update stats
      const [betData] = await db
        .select({
          heroId: heroBet.heroId,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .where(eq(heroBet.id, input.id));

      if (!betData) {
        throw new ORPCError("NOT_FOUND", { message: "Bet not found" });
      }

      // Get hero to find eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, betData.heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", { message: "Hero not found" });
      }

      // Get bet members to decrement their stats
      const members = await db
        .select({ userId: heroBetMember.userId, points: heroBetMember.points })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, input.id));

      // Decrement stats and delete bet in a transaction
      await db.transaction(async (tx) => {
        for (const member of members) {
          await tx
            .update(userStats)
            .set({
              points: sql`${userStats.points} - ${member.points}`,
              bets: sql`${userStats.bets} - 1`,
            })
            .where(
              and(
                eq(userStats.userId, member.userId),
                eq(userStats.eventId, heroData.eventId),
                eq(userStats.heroId, betData.heroId)
              )
            );
        }

        // Delete the bet (cascade will handle members)
        await tx.delete(heroBet).where(eq(heroBet.id, input.id));
      });

      return { success: true };
    }),

  getUserStats: protectedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(async ({ input }) => {
      if (input.eventId) {
        return await db
          .select()
          .from(userStats)
          .where(eq(userStats.eventId, input.eventId));
      }
      return await db.select().from(userStats);
    }),

  getRanking: protectedProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        heroId: z.number().optional(),
      })
    )
    .handler(async ({ input }) => {
      // Build where conditions
      const conditions: SQL[] = [];
      if (input.eventId) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }
      if (input.heroId) {
        conditions.push(eq(userStats.heroId, input.heroId));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Aggregate stats per user (across all heroes in the event or all events)
      const baseQuery = db
        .select({
          userId: userStats.userId,
          userName: user.name,
          userImage: user.image,
          totalPoints: sql<string>`SUM(${userStats.points})`.as("total_points"),
          totalBets: sql<number>`SUM(${userStats.bets})`.as("total_bets"),
          totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
            "total_earnings"
          ),
        })
        .from(userStats)
        .innerJoin(user, eq(userStats.userId, user.id))
        .where(whereClause)
        .groupBy(userStats.userId, user.name, user.image)
        .orderBy(desc(sql`SUM(${userStats.points})`));

      const ranking = await baseQuery;
      return ranking;
    }),

  getHeroStats: protectedProcedure
    .input(z.object({ heroId: z.number() }))
    .handler(async ({ input }) => {
      // Get total bets and points for a specific hero
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
        .where(eq(userStats.heroId, input.heroId));

      // Get hero info
      const [heroInfo] = await db
        .select({
          id: hero.id,
          name: hero.name,
          pointWorth: hero.pointWorth,
        })
        .from(hero)
        .where(eq(hero.id, input.heroId));

      return {
        heroId: input.heroId,
        heroName: heroInfo?.name ?? "Unknown",
        currentPointWorth: heroInfo?.pointWorth ?? 0,
        totalBets: Number(stats?.totalBets ?? 0),
        totalPoints: Number.parseFloat(stats?.totalPoints ?? "0"),
      };
    }),

  distributeGold: adminProcedure
    .input(z.object({ heroId: z.number(), goldAmount: z.number().positive() }))
    .handler(async ({ input }) => {
      const { heroId, goldAmount } = input;

      // Get hero info and eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId, name: hero.name })
        .from(hero)
        .where(eq(hero.id, heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", { message: "Hero not found" });
      }

      // Get all user stats for this hero
      const heroUserStats = await db
        .select({
          id: userStats.id,
          userId: userStats.userId,
          points: userStats.points,
        })
        .from(userStats)
        .where(eq(userStats.heroId, heroId));

      if (heroUserStats.length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No bets found for this hero",
        });
      }

      // Calculate total points for this hero
      const totalPoints = heroUserStats.reduce(
        (sum, stat) => sum + Number.parseFloat(stat.points),
        0
      );

      if (totalPoints <= 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Total points must be greater than 0",
        });
      }

      // Calculate point worth: goldAmount / totalPoints
      const pointWorth = goldAmount / totalPoints;

      // Update earnings for each user and hero pointWorth in a transaction
      await db.transaction(async (tx) => {
        for (const stat of heroUserStats) {
          const userPoints = Number.parseFloat(stat.points);
          const userEarnings = (userPoints * pointWorth).toFixed(2);

          await tx
            .update(userStats)
            .set({
              earnings: userEarnings,
            })
            .where(eq(userStats.id, stat.id));
        }

        // Update hero's pointWorth for reference
        await tx
          .update(hero)
          .set({ pointWorth: Math.round(pointWorth) })
          .where(eq(hero.id, heroId));
      });

      return {
        success: true,
        heroId,
        heroName: heroData.name,
        goldAmount,
        totalPoints,
        pointWorth,
        usersUpdated: heroUserStats.length,
      };
    }),

  getVault: protectedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(async ({ input }) => {
      const MIN_EARNINGS = 100_000_000; // 100 million minimum

      // Build where conditions
      const conditions: SQL[] = [];
      if (input.eventId) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Aggregate earnings per user (across heroes in the event)
      const vault = await db
        .select({
          userId: userStats.userId,
          userName: user.name,
          userImage: user.image,
          totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
            "total_earnings"
          ),
          paidOut: sql<boolean>`BOOL_AND(${userStats.paidOut})`.as("paid_out"),
        })
        .from(userStats)
        .innerJoin(user, eq(userStats.userId, user.id))
        .where(whereClause)
        .groupBy(userStats.userId, user.name, user.image)
        .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
        .orderBy(desc(sql`SUM(${userStats.earnings})`));

      return vault;
    }),

  togglePaidOut: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        eventId: z.number().optional(),
        paidOut: z.boolean(),
      })
    )
    .handler(async ({ input }) => {
      const conditions: SQL[] = [eq(userStats.userId, input.userId)];
      if (input.eventId) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }

      await db
        .update(userStats)
        .set({ paidOut: input.paidOut })
        .where(and(...conditions));

      return { success: true };
    }),

  getOldestUnpaidEvent: protectedProcedure.handler(async () => {
    const MIN_EARNINGS = 100_000_000;

    // Find the oldest event that has at least one user with unpaid earnings >= MIN_EARNINGS
    const result = await db
      .select({
        eventId: userStats.eventId,
      })
      .from(userStats)
      .innerJoin(event, eq(userStats.eventId, event.id))
      .where(eq(userStats.paidOut, false))
      .groupBy(userStats.eventId, event.endTime)
      .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
      .orderBy(sql`${event.endTime} ASC`)
      .limit(1);

    return result[0]?.eventId ?? null;
  }),
};
