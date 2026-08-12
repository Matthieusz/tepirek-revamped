// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { UserStore } from "../../adapters/user/user-store.ts";
import type { UserAdapterError } from "../../adapters/user/user-store.ts";
import type { RequestSession } from "../../protocol/auth/current-session.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  UserForbidden,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "../../protocol/user/http-api-contract.ts";
import { verifyDiscordGuildMembership as verifyDiscordGuildMembershipWorkflow } from "../../services/user/verify-discord-guild-membership-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireSession, requireVerifiedSession } =
  makeAuthorizationPolicy({
    forbidden: () => new UserForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new UserUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new UserForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  });

const projectAdapterError = (error: UserAdapterError) =>
  Effect.fail(new UserPersistenceUnavailable({ operation: error.operation }));

type ProjectedSession = Omit<
  RequestSession["session"],
  "ipAddress" | "userAgent"
> & {
  ipAddress?: Exclude<RequestSession["session"]["ipAddress"], undefined>;
  userAgent?: Exclude<RequestSession["session"]["userAgent"], undefined>;
};

type ProjectedUser = Omit<RequestSession["user"], "image" | "role"> & {
  image?: Exclude<RequestSession["user"]["image"], undefined>;
  role?: Exclude<RequestSession["user"]["role"], undefined>;
};

/** Projects an authenticated vendor session without manufacturing optional fields. */
export const projectAuthenticatedSession = (requestSession: RequestSession) => {
  const { ipAddress, userAgent, ...session } = requestSession.session;
  const { image, role, ...user } = requestSession.user;
  const projectedSession: ProjectedSession = { ...session };
  const projectedUser: ProjectedUser = { ...user };

  if (ipAddress !== undefined) {
    projectedSession.ipAddress = ipAddress;
  }
  if (userAgent !== undefined) {
    projectedSession.userAgent = userAgent;
  }
  if (image !== undefined) {
    projectedUser.image = image;
  }
  if (role !== undefined) {
    projectedUser.role = role;
  }

  return { session: projectedSession, user: projectedUser };
};

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle(
        "deleteUser",
        Effect.fn("UserHttpApiHandlers.deleteUser")(function* deleteUser({
          payload,
        }) {
          yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store
            .deleteUser(payload.userId)
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("getSession", () =>
        requireSession().pipe(Effect.map(projectAuthenticatedSession))
      )
      .handle(
        "getVerified",
        Effect.fn("UserHttpApiHandlers.getVerified")(function* getVerified() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store
            .getVerified()
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle(
        "list",
        Effect.fn("UserHttpApiHandlers.list")(function* list() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store
            .list()
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle(
        "setRole",
        Effect.fn("UserHttpApiHandlers.setRole")(function* setRole({
          payload,
        }) {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          const updatedAt = yield* DateTime.nowAsDate;
          return yield* store
            .setRole({
              actorId: session.user.id,
              role: payload.role,
              updatedAt,
              userId: payload.userId,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle(
        "setVerified",
        Effect.fn("UserHttpApiHandlers.setVerified")(function* setVerified({
          payload,
        }) {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          const updatedAt = yield* DateTime.nowAsDate;
          return yield* store
            .setVerified({
              actorId: session.user.id,
              updatedAt,
              userId: payload.userId,
              verified: payload.verified,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle(
        "updateProfile",
        Effect.fn("UserHttpApiHandlers.updateProfile")(function* updateProfile({
          payload,
        }) {
          const session = yield* requireVerifiedSession();
          const store = yield* UserStore;
          const updatedAt = yield* DateTime.nowAsDate;
          return yield* store
            .updateProfile({
              name: payload.name,
              updatedAt,
              userId: session.user.id,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle(
        "updateUserName",
        Effect.fn("UserHttpApiHandlers.updateUserName")(
          function* updateUserName({ payload }) {
            yield* requireAdminSession();
            const store = yield* UserStore;
            const updatedAt = yield* DateTime.nowAsDate;
            return yield* store
              .updateProfile({
                name: payload.name,
                updatedAt,
                userId: payload.userId,
              })
              .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
          }
        )
      )
      .handle(
        "verifyDiscordGuildMembership",
        Effect.fn("UserHttpApiHandlers.verifyDiscordGuildMembership")(
          function* verifyDiscordGuildMembership() {
            const session = yield* requireSession();
            return yield* verifyDiscordGuildMembershipWorkflow({
              userId: session.user.id,
            }).pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
          }
        )
      )
);
