/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { HeroesStoreError } from "../../adapters/heroes/heroes-store-error.ts";
import { HeroesStore } from "../../adapters/heroes/heroes-store.ts";
import {
  HeroesForbidden,
  HeroesPersistenceUnavailable,
  HeroesUnauthorized,
} from "../../protocol/heroes/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

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

const projectStoreError = Effect.fn("HeroesHttpApiHandlers.projectStoreError")(
  (error: HeroesStoreError) =>
    Effect.fail(
      new HeroesPersistenceUnavailable({ operation: error.operation })
    )
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
          yield* store
            .create(payload)
            .pipe(Effect.catchTag("HeroesStoreError", projectStoreError));
        })
      )
      .handle("deleteHero", ({ payload }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* HeroesStore;
          yield* store
            .delete(payload)
            .pipe(Effect.catchTag("HeroesStoreError", projectStoreError));
        })
      )
      .handle("listHeroes", () =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* HeroesStore;
          return yield* store
            .list()
            .pipe(Effect.catchTag("HeroesStoreError", projectStoreError));
        })
      )
      .handle("listHeroesByEvent", ({ payload }) =>
        Effect.gen(function* HeroesHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* HeroesStore;
          return yield* store
            .listByEvent(payload)
            .pipe(Effect.catchTag("HeroesStoreError", projectStoreError));
        })
      )
);
