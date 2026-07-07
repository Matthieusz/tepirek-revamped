// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  RankingForbidden,
  RankingNotFound,
  RankingPersistenceUnavailable,
  RankingUnauthorized,
} from "../../protocol/ranking/http-api-contract.js";
import type { RankingError } from "../../services/ranking/ranking-errors.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { RankingService } from "../../services/ranking/ranking-service.js";

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

const classifyRankingFailure = (error: RankingError, operation: string) => {
  if (error._tag === "RankingNotFound") {
    return new RankingNotFound({ message: error.message });
  }
  if (error._tag === "RankingPersistenceUnavailable") {
    return new RankingPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new RankingPersistenceUnavailable({ cause: error, operation });
};

const mapRankingError = <A>(
  operation: string,
  effect: Effect.Effect<A, RankingError>
) =>
  effect.pipe(
    Effect.mapError((error) => classifyRankingFailure(error, operation))
  );

export const RankingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "ranking",
  (handlers) =>
    handlers
      .handle("getHeroStats", ({ payload, request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession(request);
          return yield* mapRankingError(
            "getHeroStats",
            rankingService.getHeroStats(payload.heroId)
          );
        })
      )
      .handle("getOldestUnpaidEvent", ({ request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession(request);
          return yield* mapRankingError(
            "getOldestUnpaidEvent",
            rankingService.getOldestUnpaidEvent()
          );
        })
      )
      .handle("getRanking", ({ payload, request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession(request);
          return yield* mapRankingError(
            "getRanking",
            rankingService.getRanking(payload)
          );
        })
      )
);
