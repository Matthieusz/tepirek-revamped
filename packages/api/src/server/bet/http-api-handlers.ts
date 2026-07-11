// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  BetBadRequest,
  BetForbidden,
  BetNotFound,
  BetPersistenceUnavailable,
  BetUnauthorized,
} from "../../protocol/bet/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import type { BetError } from "../../services/bet/bet-errors.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { BetService } from "../../services/bet/bet-service.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new BetForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new BetUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new BetForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

const mapBetError = <A>(
  operation: string,
  effect: Effect.Effect<A, BetError>
) =>
  effect.pipe(
    Effect.catchTags({
      BetBadRequest: (error) =>
        Effect.fail(new BetBadRequest({ message: error.message })),
      BetNotFound: (error) =>
        Effect.fail(new BetNotFound({ message: error.message })),
      BetPersistenceUnavailable: (error) =>
        Effect.logError("Bet persistence operation failed").pipe(
          Effect.annotateLogs({
            errorTag: error._tag,
            operation: error.operation,
          }),
          Effect.andThen(
            Effect.fail(new BetPersistenceUnavailable({ operation }))
          )
        ),
    })
  );

export const BetHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "bet",
  (handlers) =>
    handlers
      .handle("create", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          const session = yield* requireAdminSession();
          return yield* mapBetError(
            "createBet",
            betService.createBet({
              createdBy: session.user.id,
              heroId: payload.heroId,
              userIds: payload.userIds,
            })
          );
        })
      )
      .handle("delete", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireAdminSession();
          return yield* mapBetError(
            "deleteBet",
            betService.deleteBet(payload.id)
          );
        })
      )
      .handle("edit", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireAdminSession();
          return yield* mapBetError(
            "editBet",
            betService.editBet({
              betId: payload.betId,
              newUserIds: payload.newUserIds,
            })
          );
        })
      )
      .handle("getAll", () =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession();
          return yield* mapBetError("getAllBets", betService.getAllBets());
        })
      )
      .handle("getAllPaginated", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession();
          return yield* mapBetError(
            "getPaginatedBets",
            betService.getPaginatedBets({
              eventId: payload.eventId,
              heroId: payload.heroId,
              limit: payload.limit ?? 10,
              page: payload.page ?? 1,
            })
          );
        })
      )
      .handle("getBetMembers", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession();
          return yield* mapBetError(
            "getBetMembers",
            betService.getBetMembers(payload.betId)
          );
        })
      )
      .handle("getByEvent", ({ payload }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession();
          return yield* mapBetError(
            "getBetsByEvent",
            betService.getBetsByEvent(payload.eventId)
          );
        })
      )
      .handle("getLatestForCopy", () =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession();
          return yield* mapBetError(
            "getLatestBetForCopy",
            betService.getLatestBetForCopy()
          );
        })
      )
);
