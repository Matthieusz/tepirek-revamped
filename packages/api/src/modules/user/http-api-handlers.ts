import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { DiscordGuildVerifier } from "./discord-verification-service.js";
import { UserForbidden, UserUnauthorized } from "./http-api-contract.js";
import { UserStore } from "./user-store.js";

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

export const UserHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "user",
  (handlers) =>
    handlers
      .handle("deleteUser", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* UserStore;
          return yield* store.deleteUser(payload.userId);
        })
      )
      .handle("getSession", ({ request }) => requireSession(request))
      .handle("getVerified", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* UserStore;
          return yield* store.getVerified();
        })
      )
      .handle("list", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* UserStore;
          return yield* store.list();
        })
      )
      .handle("setRole", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          const store = yield* UserStore;
          return yield* store.setRole({
            actorId: session.user.id,
            role: payload.role,
            userId: payload.userId,
          });
        })
      )
      .handle("setVerified", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          const store = yield* UserStore;
          return yield* store.setVerified({
            actorId: session.user.id,
            userId: payload.userId,
            verified: payload.verified,
          });
        })
      )
      .handle("updateProfile", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* UserStore;
          return yield* store.updateProfile({
            name: payload.name,
            userId: session.user.id,
          });
        })
      )
      .handle("updateUserName", ({ payload, request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* UserStore;
          return yield* store.updateProfile({
            name: payload.name,
            userId: payload.userId,
          });
        })
      )
      .handle("verifyDiscordGuildMembership", ({ request }) =>
        Effect.gen(function* UserHttpApiHandlers() {
          const session = yield* requireSession(request);
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
