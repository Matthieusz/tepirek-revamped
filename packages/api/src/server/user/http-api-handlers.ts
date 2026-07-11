// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.js";
import type { UserAdapterError } from "../../adapters/user/user-adapter-error.js";
import { UserStore } from "../../adapters/user/user-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  UserForbidden,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "../../protocol/user/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireAdminSession, requireSession, requireVerifiedSession } =
  makeAuthorizationPolicy({
    forbidden: () => new UserForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new UserUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new UserForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  });

const projectAdapterError = Effect.fn(
  "UserHttpApiHandlers.projectAdapterError"
)((error: UserAdapterError) =>
  Effect.gen(function* projectAdapterError() {
    yield* Effect.logError("User dependency operation failed").pipe(
      Effect.annotateLogs({ errorTag: error._tag, operation: error.operation })
    );
    return yield* new UserPersistenceUnavailable({
      operation: error.operation,
    });
  })
);

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle("deleteUser", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store
            .deleteUser(payload.userId)
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("getSession", () => requireSession())
      .handle("getVerified", () =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store
            .getVerified()
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("list", () =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store
            .list()
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("setRole", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store
            .setRole({
              actorId: session.user.id,
              role: payload.role,
              userId: payload.userId,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("setVerified", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store
            .setVerified({
              actorId: session.user.id,
              userId: payload.userId,
              verified: payload.verified,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("updateProfile", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store
            .updateProfile({
              name: payload.name,
              userId: session.user.id,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("updateUserName", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store
            .updateProfile({
              name: payload.name,
              userId: payload.userId,
            })
            .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
        })
      )
      .handle("verifyDiscordGuildMembership", () =>
        Effect.gen(function* UserHttpApiHandlers() {
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
            yield* store
              .markUserVerified(session.user.id)
              .pipe(Effect.catchTag("UserAdapterError", projectAdapterError));
          }

          return { valid };
        })
      )
);
