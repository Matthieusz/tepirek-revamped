import { db } from "@tepirek-revamped/db";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import type { SQL } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { UserServiceError } from "./user-service-error";
import { err, ok } from "./user-service-result";
import type { Result } from "./user-service-result";

const discordGuildSchema = z.array(z.object({ id: z.string() }));

export type { UserServiceError } from "./user-service-error";
export type { Result } from "./user-service-result";

type UserMutationExecutor = Pick<typeof db, "select" | "update">;
type AdminMutationNextState = Partial<
  Pick<typeof user.$inferSelect, "role" | "verified">
>;

const LAST_ADMIN_MESSAGE =
  "Nie można odebrać uprawnień ostatniemu administratorowi";

/** Column projection for the verified-member picker (id, image, name). */
export const verifiedMemberSelect = {
  id: user.id,
  image: user.image,
  name: user.name,
};

/** Column projection for the admin player-list view. */
export const playerListSelect = {
  createdAt: user.createdAt,
  id: user.id,
  image: user.image,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt,
  verified: user.verified,
};

/** Whether a parsed guild list contains the target Discord guild id. */
export const hasDiscordGuild = (guilds: unknown, guildId: string): boolean => {
  if (guildId === "") {
    return false;
  }
  const parsed = discordGuildSchema.safeParse(guilds);
  return parsed.success && parsed.data.some((guild) => guild.id === guildId);
};

const loadTargetUser = async (
  executor: Pick<UserMutationExecutor, "select">,
  userId: string
) => {
  const [targetUser] = await executor
    .select()
    .from(user)
    .where(eq(user.id, userId));
  return targetUser ?? null;
};

const isCurrentlyVerifiedAdmin = (targetUser: {
  readonly role: string | null;
  readonly verified: boolean;
}): boolean => targetUser.role === "admin" && targetUser.verified;

const willBecomeVerifiedAdmin = (
  target: { readonly role: string | null; readonly verified: boolean },
  next: AdminMutationNextState
): boolean => {
  const nextRole = next.role ?? target.role;
  const nextVerified = next.verified ?? target.verified;
  return nextRole === "admin" && nextVerified;
};

const countVerifiedAdmins = async (
  executor: Pick<UserMutationExecutor, "select">
) => {
  const [result] = await executor
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.verified, true)));
  return Number(result?.count ?? 0);
};

const updateAndReturnUser = async (
  executor: UserMutationExecutor,
  where: SQL,
  values: Partial<typeof user.$inferInsert>
) => {
  await executor
    .update(user)
    .set({ updatedAt: new Date(), ...values })
    .where(where);
  const [updated] = await executor.select().from(user).where(where);
  return updated ?? null;
};

/**
 * Apply a role or verified-state mutation to a target user within a serialized
 * transaction. Prevents self-demotion and protects the last verified admin.
 */
export const mutateAdminAvailabilityUser = (
  actorId: string,
  userId: string,
  next: AdminMutationNextState
): Promise<Result<typeof user.$inferSelect, UserServiceError>> =>
  db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('tepirek:user-admin-mutation'))`
    );

    const targetUser = await loadTargetUser(tx, userId);
    if (!targetUser) {
      return err({
        _tag: "UserNotFound",
        message: "Użytkownik nie istnieje",
      });
    }

    const promotingToAdmin = willBecomeVerifiedAdmin(targetUser, next);
    const demotingCurrentAdmin =
      isCurrentlyVerifiedAdmin(targetUser) && !promotingToAdmin;

    if (demotingCurrentAdmin) {
      if (targetUser.id === actorId) {
        return err({
          _tag: "AdminSelfMutationForbidden",
          message: LAST_ADMIN_MESSAGE,
        });
      }

      const verifiedAdminCount = await countVerifiedAdmins(tx);
      if (verifiedAdminCount <= 1) {
        return err({
          _tag: "LastAdminCannotBeDemoted",
          message: LAST_ADMIN_MESSAGE,
        });
      }
    }

    const updated = await updateAndReturnUser(tx, eq(user.id, userId), next);
    if (updated === null) {
      return err({
        _tag: "UserNotFound",
        message: "Użytkownik nie istnieje",
      });
    }
    return ok(updated);
  });

/** Delete an unverified user by id. Returns UserNotFound or CannotDeleteVerifiedUser on failure. */
export const deleteUser = async (
  userId: string
): Promise<Result<{ success: true }, UserServiceError>> => {
  const [targetUser] = await db.select().from(user).where(eq(user.id, userId));
  if (!targetUser) {
    return err({
      _tag: "UserNotFound",
      message: "Użytkownik nie istnieje",
    });
  }
  if (targetUser.verified) {
    return err({
      _tag: "CannotDeleteVerifiedUser",
      message: "Nie można usunąć zweryfikowanego użytkownika",
    });
  }
  await db.delete(user).where(eq(user.id, userId));
  return ok({ success: true as const });
};

/**
 * Verify the calling user's Discord guild membership against the configured
 * server and mark them as verified when confirmed.
 */
export const verifyDiscordGuildMembership = async (
  userId: string
): Promise<Result<{ valid: boolean }, UserServiceError>> => {
  const guildId = process.env.DISCORD_SERVER_ID;
  if (!guildId) {
    return err({
      _tag: "MissingDiscordConfig",
      message: "Brak konfiguracji serwera Discord",
    });
  }

  const [discordAccount] = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "discord")));

  if (!discordAccount?.accessToken) {
    return err({
      _tag: "MissingDiscordAccount",
      message: "Połącz konto Discord, aby zweryfikować członkostwo",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);

  let response: Response;
  try {
    response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bearer ${discordAccount.accessToken}`,
      },
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return err({
        _tag: "DiscordApiTimeout",
        message: "Żądanie do Discord przekroczyło limit czasu",
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    return ok({ valid: false });
  }

  const valid = hasDiscordGuild(await response.json(), guildId);
  if (valid) {
    await db
      .update(user)
      .set({ updatedAt: new Date(), verified: true })
      .where(eq(user.id, userId));
  }
  return ok({ valid });
};

/** Update a user's display name (self or admin-initiated). */
export const updateProfile = (userId: string, name: string) =>
  updateAndReturnUser(db, eq(user.id, userId), { name });

/** Admin-only: overwrite a target user's display name. */
export const updateUserName = (targetUserId: string, name: string) =>
  updateAndReturnUser(db, eq(user.id, targetUserId), { name });

/** List all verified members (id, image, name). */
export const getVerified = () =>
  db.select(verifiedMemberSelect).from(user).where(eq(user.verified, true));

/** List all users with admin-visible fields. */
export const list = () => db.select(playerListSelect).from(user);
