/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AuctionStoreError } from "../../adapters/auction/auction-store-error.ts";
import { AuctionStore } from "../../adapters/auction/auction-store.ts";
import {
  AuctionForbidden,
  AuctionPersistenceUnavailable,
  AuctionUnauthorized,
} from "../../protocol/auction/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

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
    Effect.fail(
      new AuctionPersistenceUnavailable({ operation: error.operation })
    )
);

export const AuctionHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "auction",
  (handlers) =>
    handlers
      .handle(
        "getAuctionSignups",
        Effect.fn("AuctionHttpApiHandlers.getAuctionSignups")(
          function* getAuctionSignups({ payload }) {
            yield* requireVerifiedSession();
            const store = yield* AuctionStore;
            return yield* store
              .getSignups(payload)
              .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "getAuctionStats",
        Effect.fn("AuctionHttpApiHandlers.getAuctionStats")(
          function* getAuctionStats({ payload }) {
            yield* requireVerifiedSession();
            const store = yield* AuctionStore;
            return yield* store
              .getStats(payload)
              .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "removeAuctionSignup",
        Effect.fn("AuctionHttpApiHandlers.removeAuctionSignup")(
          function* removeAuctionSignup({ payload }) {
            const session = yield* requireVerifiedSession();
            const store = yield* AuctionStore;
            return yield* store
              .removeSignup({
                actorUserId: session.user.id,
                id: payload.id,
              })
              .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "toggleAuctionSignup",
        Effect.fn("AuctionHttpApiHandlers.toggleAuctionSignup")(
          function* toggleAuctionSignup({ payload }) {
            const session = yield* requireVerifiedSession();
            const store = yield* AuctionStore;
            return yield* store
              .toggleSignup({
                ...payload,
                actorUserId: session.user.id,
              })
              .pipe(Effect.catchTag("AuctionStoreError", projectStoreError));
          }
        )
      )
);
