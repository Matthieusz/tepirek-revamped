import { db } from "@tepirek-revamped/db";
import { auctionSignups } from "@tepirek-revamped/db/schema/auction";
import { eq } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "../index";

export const auctionRouter = {
  getAllProfessionSignups: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: z.enum(["main", "support"]),
      })
    )
    .handler(async ({ input }) => {
      const rows = await db
        .select()
        .from(auctionSignups)
        .where(eq(auctionSignups.profession, input.profession));

      return rows.filter((row) => row.type === input.type);
    }),
  createSignups: protectedProcedure
    .input(
      z.object({
        profession: z.string(),
        type: z.enum(["main", "support"]),
        userId: z.string(),
        level: z.number(),
        round: z.number(),
        column: z.number(),
      })
    )
    .handler(
      async ({ input }) => await db.insert(auctionSignups).values(input)
    ),
};
