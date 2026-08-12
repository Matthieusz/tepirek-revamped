import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  AuctionConflict,
  AuctionForbidden,
  AuctionNotFound,
  AuctionPersistenceUnavailable,
  AuctionUnauthorized,
} from "../../protocol/auction/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import {
  getAuctionSignups,
  getAuctionStats,
  removeAuctionSignup,
  toggleAuctionSignup,
} from "../../services/auction/auction-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new AuctionForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new AuctionUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new AuctionForbidden({ message: "Konto oczekuje na weryfikację" }),
});

const mapAuctionError = (
  error:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationForbidden
    | ApplicationNotFound
) => {
  switch (error._tag) {
    case "ApplicationConflict": {
      return new AuctionConflict({ message: error.message });
    }
    case "ApplicationForbidden": {
      return new AuctionForbidden({ message: error.message });
    }
    case "ApplicationNotFound": {
      return new AuctionNotFound({ message: error.message });
    }
    case "ApplicationDependencyUnavailable": {
      return new AuctionPersistenceUnavailable({ operation: error.operation });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const AuctionHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "auction",
  (handlers) =>
    handlers
      .handle("getAuctionSignups", ({ payload }) =>
        Effect.gen(function* getAuctionSignupsHandler() {
          yield* requireVerifiedSession();
          return yield* getAuctionSignups(payload).pipe(
            Effect.mapError(mapAuctionError)
          );
        })
      )
      .handle("getAuctionStats", ({ payload }) =>
        Effect.gen(function* getAuctionStatsHandler() {
          yield* requireVerifiedSession();
          return yield* getAuctionStats(payload).pipe(
            Effect.mapError(mapAuctionError)
          );
        })
      )
      .handle("removeAuctionSignup", ({ payload }) =>
        Effect.gen(function* removeAuctionSignupHandler() {
          const session = yield* requireVerifiedSession();
          return yield* removeAuctionSignup({
            actorUserId: session.user.id,
            id: payload.id,
          }).pipe(Effect.mapError(mapAuctionError));
        })
      )
      .handle("toggleAuctionSignup", ({ payload }) =>
        Effect.gen(function* toggleAuctionSignupHandler() {
          const session = yield* requireVerifiedSession();
          return yield* toggleAuctionSignup({
            ...payload,
            actorUserId: session.user.id,
          }).pipe(Effect.mapError(mapAuctionError));
        })
      )
);
