// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { HeroBetLedger } from "../../modules/hero-bet-ledger.js";
import type { HeroBetLedgerError } from "../../modules/hero-bet-ledger.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  RankingForbidden,
  RankingNotFound,
  RankingPersistenceUnavailable,
  RankingUnauthorized,
} from "../../protocol/ranking/http-api-contract.js";

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

const classifyRankingFailure = (
  error: HeroBetLedgerError,
  operation: string
) => {
  if (error._tag === "HeroBetLedgerNotFound") {
    return new RankingNotFound({ message: error.message });
  }
  if (error._tag === "HeroBetLedgerPersistenceUnavailable") {
    return new RankingPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new RankingPersistenceUnavailable({ cause: error, operation });
};

const mapLedgerError = <A>(
  operation: string,
  effect: Effect.Effect<A, HeroBetLedgerError>
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
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getHeroStats",
            ledger.getHeroStats(payload.heroId)
          );
        })
      )
      .handle("getOldestUnpaidEvent", ({ request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getOldestUnpaidEvent",
            ledger.getOldestUnpaidEvent()
          );
        })
      )
      .handle("getRanking", ({ payload, request }) =>
        Effect.gen(function* RankingHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getRanking",
            ledger.getRanking(payload)
          );
        })
      )
);
