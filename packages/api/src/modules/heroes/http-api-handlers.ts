/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { HeroesStore, HeroesStoreLayer } from "./heroes-store.js";
import { HeroesForbidden, HeroesUnauthorized } from "./http-api-contract.js";

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

const requireVerifiedSession = (
  request: HttpServerRequest
): Effect.Effect<NonNullable<Session>, HeroesUnauthorized | HeroesForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new HeroesUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new HeroesForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new HeroesForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

export const HeroesHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "heroes",
  (handlers) =>
    handlers
      .handle("createHero", ({ payload, request }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* HeroesStore;
          yield* store.create(payload);
        })
      )
      .handle("deleteHero", ({ payload, request }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* HeroesStore;
          yield* store.delete(payload);
        })
      )
      .handle("listHeroes", ({ request }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* HeroesStore;
          return yield* store.list();
        })
      )
      .handle("listHeroesByEvent", ({ payload, request }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* HeroesStore;
          return yield* store.listByEvent(payload);
        })
      )
).pipe(Layer.provide(HeroesStoreLayer));
