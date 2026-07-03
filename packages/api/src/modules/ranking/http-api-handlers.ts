/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { ORPCError } from "@orpc/server";
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
import { heroBetLedger } from "../hero-bet-ledger.js";
import {
  RankingForbidden,
  RankingNotFound,
  RankingPersistenceUnavailable,
  RankingUnauthorized,
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
const requireVerifiedSession = (
  request: HttpServerRequest
): Effect.Effect<
  NonNullable<Session>,
  RankingUnauthorized | RankingForbidden
> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* Effect.promise(() =>
      auth.api.getSession({ headers: headersFromRequest(request) })
    );
    if (!session?.user) {
      return yield* new RankingUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new RankingForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

const classifyRankingFailure = (cause: unknown, operation: string) => {
  if (cause instanceof ORPCError && cause.code === "NOT_FOUND") {
    return new RankingNotFound({ message: cause.message });
  }
  if (cause instanceof ORPCError && cause.code === "FORBIDDEN") {
    return new RankingForbidden({ message: cause.message });
  }
  return new RankingPersistenceUnavailable({ cause, operation });
};

const runLedger = <A>(operation: string, work: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => classifyRankingFailure(cause, operation),
    try: work,
  });

export const RankingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "ranking",
  (handlers) =>
    handlers
      .handle("getHeroStats", ({ payload, request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getHeroStats", () =>
            heroBetLedger.getHeroStats(payload.heroId)
          );
        })
      )
      .handle("getOldestUnpaidEvent", ({ request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getOldestUnpaidEvent", () =>
            heroBetLedger.getOldestUnpaidEvent()
          );
        })
      )
      .handle("getRanking", ({ payload, request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getRanking", () =>
            heroBetLedger.getRanking(payload)
          );
        })
      )
);
