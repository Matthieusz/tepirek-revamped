/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { EventStore } from "../../adapters/event/event-store.js";
import {
  EventForbidden,
  EventUnauthorized,
} from "../../protocol/event/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new EventForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new EventUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new EventForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

export const EventHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "event",
  (handlers) =>
    handlers
      .handle("createEvent", ({ payload }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* EventStore;
          yield* store.create(payload);
        })
      )
      .handle("deleteEvent", ({ payload }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* EventStore;
          yield* store.delete(payload);
        })
      )
      .handle("listEvents", () =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* EventStore;
          return yield* store.list();
        })
      )
      .handle("toggleEventActive", ({ payload }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* EventStore;
          yield* store.toggleActive(payload);
        })
      )
);
