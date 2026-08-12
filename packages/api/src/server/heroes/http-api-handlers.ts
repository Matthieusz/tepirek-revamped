import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  HeroesForbidden,
  HeroesPersistenceUnavailable,
  HeroesUnauthorized,
} from "../../protocol/heroes/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import type { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import {
  createHero,
  deleteHero,
  listHeroes,
  listHeroesByEvent,
} from "../../services/heroes/heroes-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new HeroesForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new HeroesUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new HeroesForbidden({ message: "Konto oczekuje na weryfikację" }),
  }
);
const mapHeroesError = (error: ApplicationDependencyUnavailable) =>
  new HeroesPersistenceUnavailable({ operation: error.operation });

export const HeroesHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "heroes",
  (handlers) =>
    handlers
      .handle("createHero", ({ payload }) =>
        Effect.gen(function* createHeroHandler() {
          yield* requireAdminSession();
          yield* createHero(payload).pipe(Effect.mapError(mapHeroesError));
        })
      )
      .handle("deleteHero", ({ payload }) =>
        Effect.gen(function* deleteHeroHandler() {
          yield* requireAdminSession();
          yield* deleteHero(payload).pipe(Effect.mapError(mapHeroesError));
        })
      )
      .handle("listHeroes", () =>
        Effect.gen(function* listHeroesHandler() {
          yield* requireVerifiedSession();
          return yield* listHeroes().pipe(Effect.mapError(mapHeroesError));
        })
      )
      .handle("listHeroesByEvent", ({ payload }) =>
        Effect.gen(function* listHeroesByEventHandler() {
          yield* requireVerifiedSession();
          return yield* listHeroesByEvent(payload).pipe(
            Effect.mapError(mapHeroesError)
          );
        })
      )
);
