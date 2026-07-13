/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { EventStoreError } from "../../adapters/event/event-store-error.ts";
import { EventStore } from "../../adapters/event/event-store.ts";
import {
  EventForbidden,
  EventPersistenceUnavailable,
  EventUnauthorized,
} from "../../protocol/event/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

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

const projectStoreError = Effect.fn("EventHttpApiHandlers.projectStoreError")(
  (error: EventStoreError) =>
    Effect.fail(new EventPersistenceUnavailable({ operation: error.operation }))
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
          yield* store
            .create(payload)
            .pipe(Effect.catchTag("EventStoreError", projectStoreError));
        })
      )
      .handle("deleteEvent", ({ payload }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* EventStore;
          yield* store
            .delete(payload)
            .pipe(Effect.catchTag("EventStoreError", projectStoreError));
        })
      )
      .handle("listEvents", () =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* EventStore;
          return yield* store
            .list()
            .pipe(Effect.catchTag("EventStoreError", projectStoreError));
        })
      )
      .handle("toggleEventActive", ({ payload }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* EventStore;
          yield* store
            .toggleActive(payload)
            .pipe(Effect.catchTag("EventStoreError", projectStoreError));
        })
      )
);
