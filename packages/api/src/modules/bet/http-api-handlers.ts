// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { HeroBetLedger } from "../hero-bet-ledger.js";
import type { HeroBetLedgerError } from "../hero-bet-ledger.js";
import {
  BetBadRequest,
  BetForbidden,
  BetNotFound,
  BetPersistenceUnavailable,
  BetUnauthorized,
} from "./http-api-contract.js";

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

const classifyBetFailure = (error: HeroBetLedgerError, operation: string) => {
  if (error._tag === "HeroBetLedgerBadRequest") {
    return new BetBadRequest({ message: error.message });
  }
  if (error._tag === "HeroBetLedgerNotFound") {
    return new BetNotFound({ message: error.message });
  }
  if (error._tag === "HeroBetLedgerPersistenceUnavailable") {
    return new BetPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new BetPersistenceUnavailable({ cause: error, operation });
};

const mapLedgerError = <A>(
  operation: string,
  effect: Effect.Effect<A, HeroBetLedgerError>
) =>
  effect.pipe(Effect.mapError((error) => classifyBetFailure(error, operation)));

export const BetHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "bet",
  (handlers) =>
    handlers
      .handle("create", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          const session = yield* requireAdminSession(request);
          return yield* mapLedgerError(
            "createBet",
            ledger.createBet({
              createdBy: session.user.id,
              heroId: payload.heroId,
              userIds: payload.userIds,
            })
          );
        })
      )
      .handle("delete", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireAdminSession(request);
          return yield* mapLedgerError(
            "deleteBet",
            ledger.deleteBet(payload.id)
          );
        })
      )
      .handle("edit", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireAdminSession(request);
          return yield* mapLedgerError(
            "editBet",
            ledger.editBet({
              betId: payload.betId,
              newUserIds: payload.newUserIds,
            })
          );
        })
      )
      .handle("getAll", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError("getAllBets", ledger.getAllBets());
        })
      )
      .handle("getAllPaginated", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getPaginatedBets",
            ledger.getPaginatedBets({
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
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getBetMembers",
            ledger.getBetMembers(payload.betId)
          );
        })
      )
      .handle("getByEvent", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getBetsByEvent",
            ledger.getBetsByEvent(payload.eventId)
          );
        })
      )
      .handle("getLatestForCopy", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getLatestBetForCopy",
            ledger.getLatestBetForCopy()
          );
        })
      )
);
