import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
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
      const pointsPerMember = (POINTS_PER_HERO / memberCount).toFixed(2);

      // Get the hero to find the eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, heroId));

      if (!heroData) {
        throw new Error("Hero not found");
      }

      // Create the bet
      const [newBet] = await db
        .insert(heroBet)
        .values({
          heroId,
          createdBy: context.session.user.id,
          memberCount,
          createdAt: new Date(),
        })
        .returning();

      if (!newBet) {
        throw new Error("Failed to create bet");
      }

      // Create bet members
      await db.insert(heroBetMember).values(
        userIds.map((userId) => ({
          heroBetId: newBet.id,
          userId,
          points: pointsPerMember,
        }))
      );

      // Upsert userStats for each member
      for (const userId of userIds) {
        await db
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

    // Fetch members for each bet
    const betsWithMembers = await Promise.all(
      bets.map(async (bet) => {
        const members = await db
          .select({
            userId: heroBetMember.userId,
            userName: user.name,
            userImage: user.image,
            points: heroBetMember.points,
          })
          .from(heroBetMember)
          .innerJoin(user, eq(heroBetMember.userId, user.id))
          .where(eq(heroBetMember.heroBetId, bet.id));

        return { ...bet, members };
      })
    );

    return betsWithMembers;
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
        throw new Error("Bet not found");
      }

      // Get hero to find eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, betData.heroId));

      if (!heroData) {
        throw new Error("Hero not found");
      }

      // Get bet members to decrement their stats
      const members = await db
        .select({ userId: heroBetMember.userId, points: heroBetMember.points })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, input.id));

      // Decrement userStats for each member
      for (const member of members) {
        await db
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
      await db.delete(heroBet).where(eq(heroBet.id, input.id));

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
    .input(z.object({ eventId: z.number().optional() }))
    .handler(async ({ input }) => {
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
        .groupBy(userStats.userId, user.name, user.image)
        .orderBy(desc(sql`SUM(${userStats.points})`));

      if (input.eventId) {
        const ranking = await baseQuery.where(
          eq(userStats.eventId, input.eventId)
        );
        return ranking;
      }

      const ranking = await baseQuery;
      return ranking;
    }),
};
