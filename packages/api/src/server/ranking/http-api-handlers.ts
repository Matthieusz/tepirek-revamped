// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
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
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new RankingForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new RankingUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new RankingForbidden({
      message: "Konto oczekuje na weryfikację",
    }),
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
      .handle("getHeroStats", ({ payload }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession();
          return yield* mapRankingError(
            "getHeroStats",
            rankingService.getHeroStats(payload.heroId)
          );
        })
      )
      .handle("getOldestUnpaidEvent", () =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession();
          return yield* mapRankingError(
            "getOldestUnpaidEvent",
            rankingService.getOldestUnpaidEvent()
          );
        })
      )
      .handle("getRanking", ({ payload }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const rankingService = yield* RankingService;
          yield* requireVerifiedSession();
          return yield* mapRankingError(
            "getRanking",
            rankingService.getRanking(payload)
          );
        })
      )
);
