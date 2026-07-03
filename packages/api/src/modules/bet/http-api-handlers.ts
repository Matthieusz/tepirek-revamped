/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { ORPCError } from "@orpc/server";
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
import { heroBetLedger } from "../hero-bet-ledger.js";
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

const classifyBetFailure = (cause: unknown, operation: string) => {
  if (cause instanceof ORPCError) {
    if (cause.code === "BAD_REQUEST") {
      return new BetBadRequest({ message: cause.message });
    }
    if (cause.code === "NOT_FOUND") {
      return new BetNotFound({ message: cause.message });
    }
    if (cause.code === "FORBIDDEN") {
      return new BetForbidden({ message: cause.message });
    }
  }
  return new BetPersistenceUnavailable({ cause, operation });
};

const runLedger = <A>(operation: string, work: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => classifyBetFailure(cause, operation),
    try: work,
  });

export const BetHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "bet",
  (handlers) =>
    handlers
      .handle("create", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          return yield* runLedger("createBet", () =>
            heroBetLedger.createBet({
              createdBy: session.user.id,
              heroId: payload.heroId,
              userIds: [...payload.userIds],
            })
          );
        })
      )
      .handle("delete", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runLedger("deleteBet", () =>
            heroBetLedger.deleteBet(payload.id)
          );
        })
      )
      .handle("edit", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runLedger("editBet", () =>
            heroBetLedger.editBet({
              betId: payload.betId,
              newUserIds: [...payload.newUserIds],
            })
          );
        })
      )
      .handle("getAll", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getAllBets", () =>
            heroBetLedger.getAllBets()
          );
        })
      )
      .handle("getAllPaginated", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getPaginatedBets", () =>
            heroBetLedger.getPaginatedBets({
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
          yield* requireVerifiedSession(request);
          return yield* runLedger("getBetMembers", () =>
            heroBetLedger.getBetMembers(payload.betId)
          );
        })
      )
      .handle("getByEvent", ({ payload, request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getBetsByEvent", () =>
            heroBetLedger.getBetsByEvent(payload.eventId)
          );
        })
      )
      .handle("getLatestForCopy", ({ request }) =>
        Effect.gen(function* BetHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getLatestBetForCopy", () =>
            heroBetLedger.getLatestBetForCopy()
          );
        })
      )
);
