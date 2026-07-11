import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.js";
import { UserStore } from "../../adapters/user/user-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  UserForbidden,
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

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle("deleteUser", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store.deleteUser(payload.userId);
        })
      )
      .handle("getSession", () => requireSession())
      .handle("getVerified", () =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store.getVerified();
        })
      )
      .handle("list", () =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store.list();
        })
      )
      .handle("setRole", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store.setRole({
            actorId: session.user.id,
            role: payload.role,
            userId: payload.userId,
          });
        })
      )
      .handle("setVerified", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store.setVerified({
            actorId: session.user.id,
            userId: payload.userId,
            verified: payload.verified,
          });
        })
      )
      .handle("updateProfile", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* UserStore;
          return yield* store.updateProfile({
            name: payload.name,
            userId: session.user.id,
          });
        })
      )
      .handle("updateUserName", ({ payload }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* UserStore;
          return yield* store.updateProfile({
            name: payload.name,
            userId: payload.userId,
          });
        })
      )
      .handle("verifyDiscordGuildMembership", () =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireSession();
          const store = yield* UserStore;
          const verifier = yield* DiscordGuildVerifier;
          const accessToken = yield* store.getDiscordAccessToken(
            session.user.id
          );
          const valid = yield* verifier.verifyMembership(accessToken);

          if (valid) {
            yield* store.markUserVerified(session.user.id);
          }

          return { valid };
        })
      )
);
