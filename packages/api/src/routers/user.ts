import { ORPCError } from "@orpc/server";
import { db } from "@tepirek-revamped/db";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  protectedProcedure,
  verifiedProcedure,
} from "./procedures";
import { roleSchema, userIdSchema } from "./schemas";

const discordGuildSchema = z.array(z.object({ id: z.string() }));

export const hasDiscordGuild = (guilds: unknown, guildId: string): boolean => {
  if (guildId === "") {
    return false;
  }
  const parsed = discordGuildSchema.safeParse(guilds);
  return parsed.success && parsed.data.some((guild) => guild.id === guildId);
};

const updateAndReturnUser = async (
  where: SQL,
  values: Partial<typeof user.$inferInsert>
) => {
  await db
    .update(user)
    .set({ updatedAt: new Date(), ...values })
    .where(where);
  const [updated] = await db.select().from(user).where(where);
  return updated ?? null;
};

export const userRouter = {
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: userIdSchema,
      })
    )
    .handler(async ({ input }) => {
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
  getSession: protectedProcedure.handler(({ context }) => context.session),
  getVerified: verifiedProcedure.handler(() =>
    db.select().from(user).where(eq(user.verified, true))
  ),
  list: verifiedProcedure.handler(() => db.select().from(user)),
  setRole: adminProcedure
    .input(
      z.object({
        role: roleSchema,
        userId: userIdSchema,
      })
    )
    .handler(({ input }) =>
      updateAndReturnUser(eq(user.id, input.userId), { role: input.role })
    ),
  setVerified: adminProcedure
    .input(
      z.object({
        userId: userIdSchema,
        verified: z.boolean(),
      })
    )
    .handler(({ input }) =>
      updateAndReturnUser(eq(user.id, input.userId), {
        verified: input.verified,
      })
    ),
  updateProfile: verifiedProcedure
    .input(
      z.object({
        name: z.string().min(2),
      })
    )
    .handler(({ input, context }) =>
      updateAndReturnUser(eq(user.id, context.session.user.id), {
        name: input.name,
      })
    ),
  updateUserName: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        userId: userIdSchema,
      })
    )
    .handler(({ input }) =>
      updateAndReturnUser(eq(user.id, input.userId), { name: input.name })
    ),
  verifyDiscordGuildMembership: protectedProcedure.handler(
    async ({ context }) => {
      const guildId = process.env.DISCORD_SERVER_ID;
      if (!guildId) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Brak konfiguracji serwera Discord",
        });
      }

      const [discordAccount] = await db
        .select({ accessToken: account.accessToken })
        .from(account)
        .where(
          and(
            eq(account.userId, context.session.user.id),
            eq(account.providerId, "discord")
          )
        );

      if (!discordAccount?.accessToken) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Połącz konto Discord, aby zweryfikować członkostwo",
        });
      }

      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${discordAccount.accessToken}`,
        },
      });
      if (!response.ok) {
        return { valid: false };
      }

      const valid = hasDiscordGuild(await response.json(), guildId);
      if (valid) {
        await db
          .update(user)
          .set({ updatedAt: new Date(), verified: true })
          .where(eq(user.id, context.session.user.id));
      }
      return { valid };
    }
  ),
};
