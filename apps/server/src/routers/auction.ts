import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db";
import { auctionSignups } from "@/db/schema/auction";
import { protectedProcedure } from "@/lib/orpc";

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
		.handler(async ({ input }) => {
			return await db.insert(auctionSignups).values(input);
		}),
};
