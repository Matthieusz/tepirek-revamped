/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AuctionStore } from "../../adapters/auction/auction-store.js";
import {
  AuctionForbidden,
  AuctionUnauthorized,
} from "../../protocol/auction/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";

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
): Effect.Effect<
  NonNullable<Session>,
  AuctionUnauthorized | AuctionForbidden
> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new AuctionUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new AuctionForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

export const AuctionHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "auction",
  (handlers) =>
    handlers
      .handle("getAuctionSignups", ({ payload, request }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* AuctionStore;
          return yield* store.getSignups(payload);
        })
      )
      .handle("getAuctionStats", ({ payload, request }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* AuctionStore;
          return yield* store.getStats(payload);
        })
      )
      .handle("removeAuctionSignup", ({ payload, request }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* AuctionStore;
          return yield* store.removeSignup({
            actorUserId: session.user.id,
            id: payload.id,
          });
        })
      )
      .handle("toggleAuctionSignup", ({ payload, request }) =>
        Effect.gen(function* AuctionHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* AuctionStore;
          return yield* store.toggleSignup({
            ...payload,
            actorUserId: session.user.id,
          });
        })
      )
);
