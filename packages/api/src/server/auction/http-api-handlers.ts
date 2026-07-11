/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AuctionStoreError } from "../../adapters/auction/auction-store-error.js";
import { AuctionStore } from "../../adapters/auction/auction-store.js";
import {
  AuctionForbidden,
  AuctionPersistenceUnavailable,
  AuctionUnauthorized,
} from "../../protocol/auction/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new AuctionForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new AuctionUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new AuctionForbidden({
      message: "Konto oczekuje na weryfikację",
    }),
});

const projectStoreError = Effect.fn("AuctionHttpApiHandlers.projectStoreError")(
  (error: AuctionStoreError) =>
    Effect.gen(function* projectStoreError() {
      yield* Effect.logError("Auction persistence operation failed").pipe(
        Effect.annotateLogs({
          errorTag: error._tag,
          operation: error.operation,
        })
      );
      return yield* new AuctionPersistenceUnavailable({
        operation: error.operation,
      });
    })
);

export const AuctionHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "auction",
  (handlers) =>
    handlers
      .handle("getAuctionSignups", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store
            .getSignups(payload)
            .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
        })
      )
      .handle("getAuctionStats", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store
            .getStats(payload)
            .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
        })
      )
      .handle("removeAuctionSignup", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store
            .removeSignup({
              actorUserId: session.user.id,
              id: payload.id,
            })
            .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
        })
      )
      .handle("toggleAuctionSignup", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store
            .toggleSignup({
              ...payload,
              actorUserId: session.user.id,
            })
            .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
        })
      )
);
