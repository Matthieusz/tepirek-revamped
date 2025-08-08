import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { protectedProcedure } from "@/lib/orpc";

export const userRouter = {
	getMe: protectedProcedure.handler(async ({ context }) => {
		const [row] = await db
			.select()
			.from(user)
			.where(eq(user.id, context.session.user.id));
		return row ?? null;
	}),
	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(2),
			})
		)
		.handler(async ({ input, context }) => {
			await db
				.update(user)
				.set({ name: input.name, updatedAt: new Date() })
				.where(eq(user.id, context.session.user.id));
			const [updated] = await db
				.select()
				.from(user)
				.where(eq(user.id, context.session.user.id));
			return updated ?? null;
		}),
};
