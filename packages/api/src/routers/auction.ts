import { ORPCError } from "@orpc/server";
import { db } from "@tepirek-revamped/db";
import { auction } from "@tepirek-revamped/db/schema/auction";
import { user } from "@tepirek-revamped/db/schema/auth";
import { and, count, countDistinct, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "./procedures";
import { auctionTypeSchema } from "./schemas";

export const auctionRouter = {
  getSignups: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: auctionTypeSchema,
      })
    )
    .handler(async ({ input }) => {
      const rows = await db
        .select({
          column: auction.column,
          createdAt: auction.createdAt,
          id: auction.id,
          level: auction.level,
          round: auction.round,
          userId: auction.userId,
          userImage: user.image,
          userName: user.name,
        })
        .from(auction)
        .leftJoin(user, eq(auction.userId, user.id))
        .where(
          and(
            eq(auction.profession, input.profession),
            eq(auction.type, input.type)
          )
        )
        .orderBy(auction.createdAt);

      return rows;
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: auctionTypeSchema,
      })
    )
    .handler(async ({ input }) => {
      const result = await db
        .select({
          totalSignups: count(),
          uniqueUsers: countDistinct(auction.userId),
        })
        .from(auction)
        .where(
          and(
            eq(auction.profession, input.profession),
            eq(auction.type, input.type)
          )
        );

      return result[0] ?? { totalSignups: 0, uniqueUsers: 0 };
    }),

  removeSignup: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      // Only allow removing own signups (or admin check could be added)
      const [signup] = await db
        .select({ userId: auction.userId })
        .from(auction)
        .where(eq(auction.id, input.id));

      if (!signup) {
        throw new ORPCError("NOT_FOUND", { message: "Zapis nie znaleziony" });
      }

      if (signup.userId !== context.session.user.id) {
        throw new ORPCError("FORBIDDEN", {
          message: "Nie masz uprawnień do usunięcia tego zapisu",
        });
      }

      await db.delete(auction).where(eq(auction.id, input.id));
      return { success: true };
    }),

  toggleSignup: protectedProcedure
    .input(
      z.object({
        column: z.number(),
        level: z.number(),
        profession: z.string(),
        round: z.number(),
        type: auctionTypeSchema,
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Enforce one user per field (profession/type/level/round/column)
      const existingCell = await db
        .select({ id: auction.id, userId: auction.userId })
        .from(auction)
        .where(
          and(
            eq(auction.profession, input.profession),
            eq(auction.type, input.type),
            eq(auction.level, input.level),
            eq(auction.round, input.round),
            eq(auction.column, input.column)
          )
        )
        .limit(1);

      if (existingCell.length > 0) {
        const [cell] = existingCell;
        // If it's your signup, toggle off (unsign)
        if (cell?.userId === userId) {
          await db.delete(auction).where(eq(auction.id, cell.id));
          return { action: "removed" as const };
        }

        // Otherwise, slot is taken
        throw new ORPCError("CONFLICT", {
          message: "To pole jest już zajęte",
        });
      }

      await db.insert(auction).values({
        column: input.column,
        level: input.level,
        profession: input.profession,
        round: input.round,
        type: input.type,
        userId,
      });

      return { action: "added" as const };
    }),
};
