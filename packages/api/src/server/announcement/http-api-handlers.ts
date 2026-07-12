/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AnnouncementStoreError } from "../../adapters/announcement/announcement-store-error.ts";
import { AnnouncementStore } from "../../adapters/announcement/announcement-store.ts";
import {
  AnnouncementForbidden,
  AnnouncementPersistenceUnavailable,
  AnnouncementUnauthorized,
} from "../../protocol/announcement/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new AnnouncementForbidden({ message: "FORBIDDEN" }),
    unauthorized: () =>
      new AnnouncementUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new AnnouncementForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

const projectStoreError = Effect.fn(
  "AnnouncementHttpApiHandlers.projectStoreError"
)((error: AnnouncementStoreError) =>
  Effect.gen(function* projectStoreError() {
    yield* Effect.logError("Announcement persistence operation failed").pipe(
      Effect.annotateLogs({ errorTag: error._tag, operation: error.operation })
    );
    return yield* new AnnouncementPersistenceUnavailable({
      operation: error.operation,
    });
  })
);

export const AnnouncementHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "announcement",
  (handlers) =>
    handlers
      .handle("createAnnouncement", ({ payload }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* AnnouncementStore;
          const createdAt = new Date(yield* Clock.currentTimeMillis);

          yield* store
            .create({
              createdAt,
              description: payload.description,
              title: payload.title,
              userId: session.user.id,
            })
            .pipe(Effect.catchTag("AnnouncementStoreError", projectStoreError));
        })
      )
      .handle("deleteAnnouncement", ({ payload }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* AnnouncementStore;

          yield* store
            .delete({ id: payload.id })
            .pipe(Effect.catchTag("AnnouncementStoreError", projectStoreError));
        })
      )
      .handle("listAnnouncements", () =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AnnouncementStore;

          return yield* store
            .list()
            .pipe(Effect.catchTag("AnnouncementStoreError", projectStoreError));
        })
      )
);
