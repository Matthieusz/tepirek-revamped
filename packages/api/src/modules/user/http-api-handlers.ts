/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { ORPCError } from "@orpc/server";
import { auth } from "@tepirek-revamped/auth";
import { db } from "@tepirek-revamped/db";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import type { SQL } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
import { hasDiscordGuild } from "./discord-guild.js";
import {
  UserBadRequest,
  UserForbidden,
  UserNotFound,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "./http-api-contract.js";

const LAST_ADMIN_MESSAGE =
  "Nie można odebrać uprawnień ostatniemu administratorowi";
const verifiedMemberSelect = {
  id: user.id,
  image: user.image,
  name: user.name,
};
const playerListSelect = {
  createdAt: user.createdAt,
  id: user.id,
  image: user.image,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt,
  verified: user.verified,
};
type UserMutationExecutor = Pick<typeof db, "select" | "update">;
type AdminMutationNextState = Partial<
  Pick<typeof user.$inferSelect, "role" | "verified">
>;

const headersFromRequest = (request: HttpServerRequest): Headers => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
};
type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
const loadSession = (request: HttpServerRequest) =>
  Effect.promise(() =>
    auth.api.getSession({ headers: headersFromRequest(request) })
  );
const requireSession = (
  request: HttpServerRequest
): Effect.Effect<NonNullable<Session>, UserUnauthorized> =>
  Effect.gen(function* requireSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new UserUnauthorized({ message: "UNAUTHORIZED" });
    }
    return session;
  });
const requireVerifiedSession = (
  request: HttpServerRequest
): Effect.Effect<NonNullable<Session>, UserUnauthorized | UserForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* requireSession(request);
    if (session.user.verified !== true) {
      return yield* new UserForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });
const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new UserForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

const loadTargetUser = async (
  executor: Pick<UserMutationExecutor, "select">,
  userId: string
) => {
  const [targetUser] = await executor
    .select()
    .from(user)
    .where(eq(user.id, userId));
  if (!targetUser) {
    throw new ORPCError("NOT_FOUND", { message: "Użytkownik nie istnieje" });
  }
  return targetUser;
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
const assertAdminMutationAllowed = async (
  executor: Pick<UserMutationExecutor, "select">,
  actorId: string,
  targetUser: { id: string; role: string | null; verified: boolean },
  next: AdminMutationNextState
) => {
  const nextRole = next.role ?? targetUser.role;
  const nextVerified = next.verified ?? targetUser.verified;
  const willBeVerifiedAdmin = nextRole === "admin" && nextVerified === true;
  const isCurrentlyVerifiedAdmin =
    targetUser.role === "admin" && targetUser.verified === true;
  if (!isCurrentlyVerifiedAdmin || willBeVerifiedAdmin) {
    return;
  }
  if (targetUser.id === actorId) {
    throw new ORPCError("FORBIDDEN", { message: LAST_ADMIN_MESSAGE });
  }
  const verifiedAdminCount = await countVerifiedAdmins(executor);
  if (verifiedAdminCount <= 1) {
    throw new ORPCError("FORBIDDEN", { message: LAST_ADMIN_MESSAGE });
  }
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
const mutateAdminAvailabilityUser = (
  actorId: string,
  userId: string,
  next: AdminMutationNextState
) =>
  db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('tepirek:user-admin-mutation'))`
    );
    const targetUser = await loadTargetUser(tx, userId);
    await assertAdminMutationAllowed(tx, actorId, targetUser, next);
    return updateAndReturnUser(tx, eq(user.id, userId), next);
  });
const classifyUserFailure = (cause: unknown, operation: string) => {
  if (cause instanceof ORPCError) {
    if (cause.code === "BAD_REQUEST") {
      return new UserBadRequest({ message: cause.message });
    }
    if (cause.code === "NOT_FOUND") {
      return new UserNotFound({ message: cause.message });
    }
    if (cause.code === "FORBIDDEN") {
      return new UserForbidden({ message: cause.message });
    }
  }
  return new UserPersistenceUnavailable({ cause, operation });
};
const runUser = <A>(operation: string, work: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => classifyUserFailure(cause, operation),
    try: work,
  });

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle("deleteUser", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runUser("deleteUser", async () => {
            const targetUser = await loadTargetUser(db, payload.userId);
            if (targetUser.verified) {
              throw new ORPCError("BAD_REQUEST", {
                message: "Nie można usunąć zweryfikowanego użytkownika",
              });
            }
            await db.delete(user).where(eq(user.id, payload.userId));
            return { success: true as const };
          });
        })
      )
      .handle("getSession", ({ request }) => requireSession(request))
      .handle("getVerified", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runUser("getVerified", () =>
            db
              .select(verifiedMemberSelect)
              .from(user)
              .where(eq(user.verified, true))
          );
        })
      )
      .handle("list", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runUser("list", () =>
            db.select(playerListSelect).from(user)
          );
        })
      )
      .handle("setRole", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          return yield* runUser("setRole", () =>
            mutateAdminAvailabilityUser(session.user.id, payload.userId, {
              role: payload.role,
            })
          );
        })
      )
      .handle("setVerified", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          return yield* runUser("setVerified", () =>
            mutateAdminAvailabilityUser(session.user.id, payload.userId, {
              verified: payload.verified,
            })
          );
        })
      )
      .handle("updateProfile", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          return yield* runUser("updateProfile", () =>
            updateAndReturnUser(db, eq(user.id, session.user.id), {
              name: payload.name,
            })
          );
        })
      )
      .handle("updateUserName", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runUser("updateUserName", () =>
            updateAndReturnUser(db, eq(user.id, payload.userId), {
              name: payload.name,
            })
          );
        })
      )
      .handle("verifyDiscordGuildMembership", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireSession(request);
          return yield* runUser("verifyDiscordGuildMembership", async () => {
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
                  eq(account.userId, session.user.id),
                  eq(account.providerId, "discord")
                )
              );
            if (!discordAccount?.accessToken) {
              throw new ORPCError("BAD_REQUEST", {
                message: "Połącz konto Discord, aby zweryfikować członkostwo",
              });
            }
            const response = await fetch(
              "https://discord.com/api/users/@me/guilds",
              {
                headers: {
                  Authorization: `Bearer ${discordAccount.accessToken}`,
                },
              }
            );
            if (!response.ok) {
              return { valid: false };
            }
            const valid = hasDiscordGuild(await response.json(), guildId);
            if (valid) {
              await db
                .update(user)
                .set({ updatedAt: new Date(), verified: true })
                .where(eq(user.id, session.user.id));
            }
            return { valid };
          });
        })
      )
);
