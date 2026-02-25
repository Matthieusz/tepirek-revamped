import { ORPCError } from "@orpc/server";
import { db } from "@tepirek-revamped/db";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, protectedProcedure } from "../index";

export const userRouter = {
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      })
    )
    .handler(async ({ input }) => {
      // Check if user is unverified before deleting
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId));
      if (!targetUser) {
        throw new ORPCError("NOT_FOUND", {
          message: "Użytkownik nie istnieje",
        });
      }
      if (targetUser.verified) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nie można usunąć zweryfikowanego użytkownika",
        });
      }
      await db.delete(user).where(eq(user.id, input.userId));
      return { success: true };
    }),
  getDiscordAccessToken: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select({ accessToken: account.accessToken })
      .from(account)
      .where(eq(account.userId, context.session.user.id));
    return rows[0]?.accessToken ?? null;
  }),
  getSession: protectedProcedure.handler(({ context }) => context.session),
  getVerified: protectedProcedure.handler(async () =>
    db.select().from(user).where(eq(user.verified, true))
  ),
  list: protectedProcedure.handler(async () => await db.select().from(user)),
  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["user", "admin"]),
      })
    )
    .handler(async ({ input }) => {
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
  setVerified: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        verified: z.boolean(),
      })
    )
    .handler(async ({ input }) => {
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
  updateUserName: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().min(2),
      })
    )
    .handler(async ({ input }) => {
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
};
