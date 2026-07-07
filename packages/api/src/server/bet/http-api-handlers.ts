// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
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
): Effect.Effect<NonNullable<Session>, BetUnauthorized | BetForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new BetUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new BetForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new BetForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

const classifyBetFailure = (error: BetError, operation: string) => {
  if (error._tag === "BetBadRequest") {
    return new BetBadRequest({ message: error.message });
  }
  if (error._tag === "BetNotFound") {
    return new BetNotFound({ message: error.message });
  }
  if (error._tag === "BetPersistenceUnavailable") {
    return new BetPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new BetPersistenceUnavailable({ cause: error, operation });
};

const mapBetError = <A>(
  operation: string,
  effect: Effect.Effect<A, BetError>
) =>
  effect.pipe(Effect.mapError((error) => classifyBetFailure(error, operation)));

export const BetHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "bet",
  (handlers) =>
    handlers
      .handle("create", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          const session = yield* requireAdminSession(request);
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
      .handle("delete", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireAdminSession(request);
          return yield* mapBetError(
            "deleteBet",
            betService.deleteBet(payload.id)
          );
        })
      )
      .handle("edit", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireAdminSession(request);
          return yield* mapBetError(
            "editBet",
            betService.editBet({
              betId: payload.betId,
              newUserIds: payload.newUserIds,
            })
          );
        })
      )
      .handle("getAll", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession(request);
          return yield* mapBetError("getAllBets", betService.getAllBets());
        })
      )
      .handle("getAllPaginated", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession(request);
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
      .handle("getBetMembers", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession(request);
          return yield* mapBetError(
            "getBetMembers",
            betService.getBetMembers(payload.betId)
          );
        })
      )
      .handle("getByEvent", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession(request);
          return yield* mapBetError(
            "getBetsByEvent",
            betService.getBetsByEvent(payload.eventId)
          );
        })
      )
      .handle("getLatestForCopy", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const betService = yield* BetService;
          yield* requireVerifiedSession(request);
          return yield* mapBetError(
            "getLatestBetForCopy",
            betService.getLatestBetForCopy()
          );
        })
      )
);
