import { eq } from "drizzle-orm";
import z from "zod";
import { hero } from "@/db/schema/bet";
import { db } from "../db";
import { protectedProcedure } from "../lib/orpc";

export const heroesRouter = {
	getAll: protectedProcedure.handler(async () => {
		return await db.select().from(hero);
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				image: z.string().min(1).optional(),
				eventId: z.number(),
			})
		)
		.handler(async ({ input }) => {
			return await db.insert(hero).values({
				name: input.name,
				image: input.image || null,
				eventId: input.eventId,
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			return await db.delete(hero).where(eq(hero.id, input.id));
		}),
};
