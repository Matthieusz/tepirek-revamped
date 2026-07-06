/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  AnnouncementStore,
  AnnouncementStoreLayer,
} from "../../modules/announcement/announcement-store.js";
import {
  AnnouncementForbidden,
  AnnouncementUnauthorized,
} from "../../protocol/announcement/http-api-contract.js";
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
    auth.api.getSession({
      headers: headersFromRequest(request),
    })
  );

const requireVerifiedSession = (
  request: HttpServerRequest
): Effect.Effect<
  NonNullable<Session>,
  AnnouncementUnauthorized | AnnouncementForbidden
> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);

    if (!session?.user) {
      return yield* new AnnouncementUnauthorized({ message: "UNAUTHORIZED" });
    }

    if (session.user.verified !== true) {
      return yield* new AnnouncementForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }

    return session;
  });

const requireAdminSession = (
  request: HttpServerRequest
): Effect.Effect<
  NonNullable<Session>,
  AnnouncementUnauthorized | AnnouncementForbidden
> =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);

    if (session.user.role !== "admin") {
      return yield* new AnnouncementForbidden({ message: "FORBIDDEN" });
    }

    return session;
  });

export const AnnouncementHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "announcement",
  (handlers) =>
    handlers
      .handle("createAnnouncement", ({ payload, request }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          const session = yield* requireAdminSession(request);
          const store = yield* AnnouncementStore;

          yield* store.create({
            description: payload.description,
            title: payload.title,
            userId: session.user.id,
          });
        })
      )
      .handle("deleteAnnouncement", ({ payload, request }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* AnnouncementStore;

          yield* store.delete({ id: payload.id });
        })
      )
      .handle("listAnnouncements", ({ request }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* AnnouncementStore;

          return yield* store.list();
        })
      )
).pipe(Layer.provide(AnnouncementStoreLayer));
