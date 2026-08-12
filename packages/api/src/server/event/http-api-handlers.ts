import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  EventForbidden,
  EventPersistenceUnavailable,
  EventUnauthorized,
} from "../../protocol/event/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import type { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import {
  createEvent,
  deleteEvent,
  listEvents,
  toggleEventActive,
} from "../../services/event/event-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new EventForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new EventUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new EventForbidden({ message: "Konto oczekuje na weryfikację" }),
  }
);
const mapEventError = (error: ApplicationDependencyUnavailable) =>
  new EventPersistenceUnavailable({ operation: error.operation });

export const EventHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "event",
  (handlers) =>
    handlers
      .handle("createEvent", ({ payload }) =>
        Effect.gen(function* createEventHandler() {
          yield* requireAdminSession();
          yield* createEvent(payload).pipe(Effect.mapError(mapEventError));
        })
      )
      .handle("deleteEvent", ({ payload }) =>
        Effect.gen(function* deleteEventHandler() {
          yield* requireAdminSession();
          yield* deleteEvent(payload).pipe(Effect.mapError(mapEventError));
        })
      )
      .handle("listEvents", () =>
        Effect.gen(function* listEventsHandler() {
          yield* requireVerifiedSession();
          return yield* listEvents().pipe(Effect.mapError(mapEventError));
        })
      )
      .handle("toggleEventActive", ({ payload }) =>
        Effect.gen(function* toggleEventActiveHandler() {
          yield* requireAdminSession();
          yield* toggleEventActive(payload).pipe(
            Effect.mapError(mapEventError)
          );
        })
      )
);
