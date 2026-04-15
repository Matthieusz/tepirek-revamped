import { ORPCError } from "@orpc/server";
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, userStats } from "@tepirek-revamped/db/schema/bet";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "./procedures";

export const vaultRouter = {
  distributeGold: adminProcedure
    .input(z.object({ goldAmount: z.number().positive(), heroId: z.number() }))
    .handler(async ({ input }) => {
      const { heroId, goldAmount } = input;

      // Get hero info and eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId, name: hero.name })
        .from(hero)
        .where(eq(hero.id, heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Heros nie znaleziony",
        });
      }

      // Get all user stats for this hero
      const heroUserStats = await db
        .select({
          id: userStats.id,
          points: userStats.points,
          userId: userStats.userId,
        })
        .from(userStats)
        .where(eq(userStats.heroId, heroId));

      if (heroUserStats.length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Brak obstawień dla tego herosa",
        });
      }

      // Calculate total points for this hero
      const totalPoints = heroUserStats.reduce(
        (sum, stat) => sum + Number.parseFloat(stat.points),
        0
      );

      if (totalPoints <= 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Suma punktów musi być większa od zera",
        });
      }

      // Calculate point worth: goldAmount / totalPoints
      const pointWorth = goldAmount / totalPoints;

      // Update earnings for each user and hero pointWorth in a transaction
      await db.transaction(async (tx) => {
        await tx
          .update(userStats)
          .set({
            earnings: sql`ROUND((${userStats.points}) * ${pointWorth}, 2)`,
          })
          .where(eq(userStats.heroId, heroId));

        // Update hero's pointWorth for reference
        await tx
          .update(hero)
          .set({ pointWorth: Math.round(pointWorth) })
          .where(eq(hero.id, heroId));
      });

      return {
        goldAmount,
        heroId,
        heroName: heroData.name,
        pointWorth,
        success: true,
        totalPoints,
        usersUpdated: heroUserStats.length,
      };
    }),

  getUserStats: protectedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(async ({ input }) => {
      if (input.eventId !== undefined) {
        return db
          .select()
          .from(userStats)
          .where(eq(userStats.eventId, input.eventId));
      }
      return db.select().from(userStats);
    }),

  getVault: protectedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(async ({ input }) => {
      // Build where conditions
      const conditions: SQL[] = [];
      if (input.eventId !== undefined) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Aggregate earnings per user (across heroes in the event)
      const vault = await db
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

      return vault;
    }),

  togglePaidOut: adminProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        paidOut: z.boolean(),
        userId: z.string(),
      })
    )
    .handler(async ({ input }) => {
      const conditions: SQL[] = [eq(userStats.userId, input.userId)];
      if (input.eventId !== undefined) {
        conditions.push(eq(userStats.eventId, input.eventId));
      }

      await db
        .update(userStats)
        .set({ paidOut: input.paidOut })
        .where(and(...conditions));

      return { success: true };
    }),
};
