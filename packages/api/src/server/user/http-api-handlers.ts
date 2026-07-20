// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.ts";
import type { UserAdapterError } from "../../adapters/user/user-adapter-error.ts";
import { UserStore } from "../../adapters/user/user-store.ts";
import type { RequestSession } from "../../protocol/auth/current-session.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  UserForbidden,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "../../protocol/user/http-api-contract.ts";
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

const projectAuthenticatedSession = (requestSession: RequestSession) => {
  const { ipAddress, userAgent, ...session } = requestSession.session;
  const { image, role, ...user } = requestSession.user;

  return {
    session: {
      ...session,
      ...(ipAddress === undefined ? {} : { ipAddress }),
      ...(userAgent === undefined ? {} : { userAgent }),
    },
    user: {
      ...user,
      ...(image === undefined ? {} : { image }),
      ...(role === undefined ? {} : { role }),
    },
  };
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
          const updatedAt = new Date(yield* Clock.currentTimeMillis);
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
          const updatedAt = new Date(yield* Clock.currentTimeMillis);
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
          const updatedAt = new Date(yield* Clock.currentTimeMillis);
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
            const updatedAt = new Date(yield* Clock.currentTimeMillis);
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
            const store = yield* UserStore;
            const verifier = yield* DiscordGuildVerifier;
            const accessToken = yield* store
              .getDiscordAccessToken(session.user.id)
              .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
            const valid = yield* verifier
              .verifyMembership(accessToken)
              .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));

            if (valid) {
              const updatedAt = new Date(yield* Clock.currentTimeMillis);
              yield* store
                .markUserVerified({ updatedAt, userId: session.user.id })
                .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
            }

            return { valid };
          }
        )
      )
);
