/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AuctionStore } from "../../adapters/auction/auction-store.js";
import {
  AuctionForbidden,
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

export const AuctionHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "auction",
  (handlers) =>
    handlers
      .handle("getAuctionSignups", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store.getSignups(payload);
        })
      )
      .handle("getAuctionStats", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store.getStats(payload);
        })
      )
      .handle("removeAuctionSignup", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store.removeSignup({
            actorUserId: session.user.id,
            id: payload.id,
          });
        })
      )
      .handle("toggleAuctionSignup", ({ payload }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* AuctionStore;
          return yield* store.toggleSignup({
            ...payload,
            actorUserId: session.user.id,
          });
        })
      )
);
