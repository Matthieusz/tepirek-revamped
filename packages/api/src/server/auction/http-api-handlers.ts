/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
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
  clearAuctionSignups,
  getAuctionSignups,
  getAuctionStats,
  removeAuctionSignup,
  toggleAuctionSignup,
} from "../../services/auction/auction-service.ts";
import { buildAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } =
  buildAuthorizationPolicy({
    forbidden: () => new AuctionForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new AuctionUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new AuctionForbidden({ message: "Konto oczekuje na weryfikację" }),
  });

const mapAuctionError = (
  input:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationForbidden
    | ApplicationNotFound
) =>
  Match.value(input).pipe(
    Match.tag(
      "ApplicationConflict",
      (error) => new AuctionConflict({ message: error.message })
    ),
    Match.tag(
      "ApplicationForbidden",
      (error) => new AuctionForbidden({ message: error.message })
    ),
    Match.tag(
      "ApplicationNotFound",
      (error) => new AuctionNotFound({ message: error.message })
    ),
    Match.tag(
      "ApplicationDependencyUnavailable",
      (error) =>
        new AuctionPersistenceUnavailable({ operation: error.operation })
    ),
    Match.exhaustive
  );

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
      .handle("clearAuctionSignups", ({ payload }) =>
        Effect.gen(function* clearAuctionSignupsHandler() {
          yield* requireAdminSession();

          return yield* clearAuctionSignups(payload).pipe(
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
