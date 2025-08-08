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
	list: protectedProcedure.handler(async () => {
		return await db.select().from(user);
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
	// Admin: toggle verified status
	setVerified: protectedProcedure
		.input(
			z.object({
				userId: z.string().min(1),
				verified: z.boolean(),
			})
		)
		.handler(async ({ input, context }) => {
			if (context.session.user.role !== "admin") {
				throw new Error("FORBIDDEN");
			}
			await db
				.update(user)
				.set({ verified: input.verified, updatedAt: new Date() })
				.where(eq(user.id, input.userId));
			const [updated] = await db
				.select()
				.from(user)
				.where(eq(user.id, input.userId));
			return updated ?? null;
		}),
	// Admin: promote/demote role
	setRole: protectedProcedure
		.input(
			z.object({
				userId: z.string().min(1),
				role: z.enum(["user", "admin"]),
			})
		)
		.handler(async ({ input, context }) => {
			if (context.session.user.role !== "admin") {
				throw new Error("FORBIDDEN");
			}
			await db
				.update(user)
				.set({ role: input.role, updatedAt: new Date() })
				.where(eq(user.id, input.userId));
			const [updated] = await db
				.select()
				.from(user)
				.where(eq(user.id, input.userId));
			return updated ?? null;
		}),
};
