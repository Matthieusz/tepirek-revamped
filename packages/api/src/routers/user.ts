import { db } from "@tepirek-revamped/db";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "../index";

export const userRouter = {
  getVerified: protectedProcedure.handler(async () =>
    db.select().from(user).where(eq(user.verified, true))
  ),
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
  verifySelf: protectedProcedure.handler(
    async ({ context }) =>
      await db
        .update(user)
        .set({ verified: true, updatedAt: new Date() })
        .where(eq(user.id, context.session.user.id))
  ),
  getDiscordAccessToken: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(eq(account.userId, context.session.user.id));
    return rows[0]?.accessToken ?? null;
  }),
  getSession: protectedProcedure.handler(({ context }) => context.session),
  list: protectedProcedure.handler(async () => await db.select().from(user)),
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
  updateUserName: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(2),
      })
    )
    .handler(async ({ input, context }) => {
      if (context.session.user.role !== "admin") {
        throw new Error("FORBIDDEN");
      }
      await db
        .update(user)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(user.id, input.userId));
      const [updated] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId));
      return updated ?? null;
    }),
  deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      })
    )
    .handler(async ({ input, context }) => {
      if (context.session.user.role !== "admin") {
        throw new Error("FORBIDDEN");
      }
      // Check if user is unverified before deleting
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId));
      if (!targetUser) {
        throw new Error("Użytkownik nie istnieje");
      }
      if (targetUser.verified) {
        throw new Error("Nie można usunąć zweryfikowanego użytkownika");
      }
      await db.delete(user).where(eq(user.id, input.userId));
      return { success: true };
    }),
};
