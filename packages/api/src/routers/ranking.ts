import { ORPCError } from "@orpc/server";
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, heroBet, userStats } from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "./procedures";

export const rankingRouter = {
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

      if (!heroInfo) {
        throw new ORPCError("NOT_FOUND", {
          message: "Heros nie znaleziony",
        });
      }

      return {
        currentPointWorth: heroInfo.pointWorth,
        heroId: input.heroId,
        heroName: heroInfo.name,
        totalBets: Number(stats?.totalBets ?? 0),
        totalPoints: Number.parseFloat(stats?.totalPoints ?? "0"),
      };
    }),

  getOldestUnpaidEvent: protectedProcedure.handler(async () => {
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
      if (input.eventId !== undefined) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }
      if (input.heroId !== undefined) {
        conditions.push(eq(userStats.heroId, input.heroId));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Aggregate stats per user (across all heroes in the event or all events)
      const baseQuery = db
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

      const ranking = await baseQuery;

      // Count distinct bets
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
          : (pointWorthRows[0]?.pointWorth ?? null);

      return { pointWorth, ranking, totalBets };
    }),
};
