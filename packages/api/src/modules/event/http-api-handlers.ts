/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
import { EventStore, EventStoreLayer } from "./event-store.js";
import { EventForbidden, EventUnauthorized } from "./http-api-contract.js";

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
): Effect.Effect<NonNullable<Session>, EventUnauthorized | EventForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new EventUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new EventForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });

const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new EventForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

export const EventHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "event",
  (handlers) =>
    handlers
      .handle("createEvent", ({ payload, request }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* EventStore;
          yield* store.create(payload);
        })
      )
      .handle("deleteEvent", ({ payload, request }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* EventStore;
          yield* store.delete(payload);
        })
      )
      .handle("listEvents", ({ request }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* EventStore;
          return yield* store.list();
        })
      )
      .handle("toggleEventActive", ({ payload, request }) =>
        Effect.gen(function* EventHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* EventStore;
          yield* store.toggleActive(payload);
        })
      )
).pipe(Layer.provide(EventStoreLayer));
