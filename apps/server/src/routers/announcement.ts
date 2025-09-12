import { eq } from "drizzle-orm";
import z from "zod";
import { announcement } from "@/db/schema/announcement";
import { user } from "@/db/schema/auth";
import { db } from "../db";
import { protectedProcedure } from "../lib/orpc";

export const announcementRouter = {
	getAll: protectedProcedure.handler(async () => {
		return await db
			.select({
				id: announcement.id,
				title: announcement.title,
				description: announcement.description,
				createdAt: announcement.createdAt,
				user: {
					id: user.id,
					name: user.name,
					image: user.image,
				},
			})
			.from(announcement)
			.leftJoin(user, eq(announcement.userId, user.id));
	}),

	create: protectedProcedure
		.input(
			z.object({ title: z.string().min(1), description: z.string().min(1) })
		)
		.handler(async ({ input, context }) => {
			return await db.insert(announcement).values({
				title: input.title,
				description: input.description,
				userId: context.session.user.id,
				createdAt: new Date(),
			});
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			return await db.delete(announcement).where(eq(announcement.id, input.id));
		}),
};
