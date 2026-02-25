import { db } from "@tepirek-revamped/db";
import { auctionSignups } from "@tepirek-revamped/db/schema/auction";
import { user } from "@tepirek-revamped/db/schema/auth";
import { and, count, countDistinct, eq } from "drizzle-orm";
import z from "zod";

import { protectedProcedure } from "../index";

export const auctionRouter = {
  getSignups: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: z.enum(["main", "support"]),
      })
    )
    .handler(async ({ input }) => {
      const rows = await db
        .select({
          id: auctionSignups.id,
          userId: auctionSignups.userId,
          level: auctionSignups.level,
          round: auctionSignups.round,
          column: auctionSignups.column,
          createdAt: auctionSignups.createdAt,
          userName: user.name,
          userImage: user.image,
        })
        .from(auctionSignups)
        .leftJoin(user, eq(auctionSignups.userId, user.id))
        .where(
          and(
            eq(auctionSignups.profession, input.profession),
            eq(auctionSignups.type, input.type)
          )
        )
        .orderBy(auctionSignups.createdAt);

      return rows;
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: z.enum(["main", "support"]),
      })
    )
    .handler(async ({ input }) => {
      const result = await db
        .select({
          totalSignups: count(),
          uniqueUsers: countDistinct(auctionSignups.userId),
        })
        .from(auctionSignups)
        .where(
          and(
            eq(auctionSignups.profession, input.profession),
            eq(auctionSignups.type, input.type)
          )
        );

      return result[0] ?? { totalSignups: 0, uniqueUsers: 0 };
    }),

  removeSignup: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      // Only allow removing own signups (or admin check could be added)
      const signup = await db
        .select({ userId: auctionSignups.userId })
        .from(auctionSignups)
        .where(eq(auctionSignups.id, input.id))
        .limit(1);

      if (signup.length === 0) {
        throw new Error("Signup not found");
      }

      if (signup[0].userId !== context.session.user.id) {
        throw new Error("Not authorized to remove this signup");
      }

      await db.delete(auctionSignups).where(eq(auctionSignups.id, input.id));
      return { success: true };
    }),

  toggleSignup: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: z.enum(["main", "support"]),
        level: z.number(),
        round: z.number(),
        column: z.number(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Enforce one user per field (profession/type/level/round/column)
      const existingCell = await db
        .select({ id: auctionSignups.id, userId: auctionSignups.userId })
        .from(auctionSignups)
        .where(
          and(
            eq(auctionSignups.profession, input.profession),
            eq(auctionSignups.type, input.type),
            eq(auctionSignups.level, input.level),
            eq(auctionSignups.round, input.round),
            eq(auctionSignups.column, input.column)
          )
        )
        .limit(1);

      if (existingCell.length > 0) {
        // If it's your signup, toggle off (unsign)
        if (existingCell[0].userId === userId) {
          await db
            .delete(auctionSignups)
            .where(eq(auctionSignups.id, existingCell[0].id));
          return { action: "removed" as const };
        }

        // Otherwise, slot is taken
        throw new Error("To pole jest już zajęte");
      }

      await db.insert(auctionSignups).values({
        profession: input.profession,
        type: input.type,
        userId,
        level: input.level,
        round: input.round,
        column: input.column,
      });

      return { action: "added" as const };
    }),
};
