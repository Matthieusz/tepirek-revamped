import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import { protectedProcedure } from "@/lib/orpc";

export const userRouter = {
	validateDiscordGuild: protectedProcedure
		.input(
			z.object({
				accessToken: z.string().min(1),
			})
		)
		.handler(async ({ input }) => {
			const response = await fetch("https://discord.com/api/users/@me/guilds", {
				headers: {
					Authorization: `Bearer ${input.accessToken}`,
				},
			});
			if (!response.ok) {
				return { valid: false };
			}
			const guildId = process.env.DISCORD_SERVER_ID;
			const guilds = await response.json();
			if (Array.isArray(guilds)) {
				return {
					valid: guilds.some((guild: { id: string }) => guild.id === guildId),
				};
			}
			return { valid: false };
		}),
	verifySelf: protectedProcedure.handler(async ({ context }) => {
		return await db
			.update(user)
			.set({ verified: true, updatedAt: new Date() })
			.where(eq(user.id, context.session.user.id));
	}),
	getDiscordAccessToken: protectedProcedure.handler(async ({ context }) => {
		const rows = await db
			.select({ accessToken: account.accessToken })
			.from(account)
			.where(eq(account.userId, context.session.user.id));
		return rows[0]?.accessToken ?? null;
	}),
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
