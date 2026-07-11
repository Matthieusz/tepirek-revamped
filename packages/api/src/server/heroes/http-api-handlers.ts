/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { HeroesStore } from "../../adapters/heroes/heroes-store.js";
import {
  HeroesForbidden,
  HeroesUnauthorized,
} from "../../protocol/heroes/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new HeroesForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new HeroesUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new HeroesForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

export const HeroesHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "heroes",
  (handlers) =>
    handlers
      .handle("createHero", ({ payload }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* HeroesStore;
          yield* store.create(payload);
        })
      )
      .handle("deleteHero", ({ payload }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* HeroesStore;
          yield* store.delete(payload);
        })
      )
      .handle("listHeroes", () =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* HeroesStore;
          return yield* store.list();
        })
      )
      .handle("listHeroesByEvent", ({ payload }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* HeroesStore;
          return yield* store.listByEvent(payload);
        })
      )
);
