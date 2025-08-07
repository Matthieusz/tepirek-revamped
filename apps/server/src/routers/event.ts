import { eq } from "drizzle-orm";
import z from "zod";
import { event } from "@/db/schema/event";
import { db } from "../db";
import { protectedProcedure } from "../lib/orpc";

export const eventRouter = {
	getAll: protectedProcedure.handler(async () => {
		return await db.select().from(event);
	}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1), endTime: z.iso.datetime() }))
		.handler(async ({ input }) => {
			return await db.insert(event).values({
				name: input.name,
				endTime: new Date(input.endTime),
			});
		}),

	toggleActive: protectedProcedure
		.input(z.object({ id: z.number(), active: z.boolean() }))
		.handler(async ({ input }) => {
			return await db
				.update(event)
				.set({ active: input.active })
				.where(eq(event.id, input.id));
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			return await db.delete(event).where(eq(event.id, input.id));
		}),
};
