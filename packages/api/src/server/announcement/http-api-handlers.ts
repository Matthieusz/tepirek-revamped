import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  AnnouncementForbidden,
  AnnouncementPersistenceUnavailable,
  AnnouncementUnauthorized,
} from "../../protocol/announcement/http-api-contract.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
} from "../../services/announcement/announcement-service.ts";
import type { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new AnnouncementForbidden({ message: "FORBIDDEN" }),
    unauthorized: () =>
      new AnnouncementUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new AnnouncementForbidden({ message: "Konto oczekuje na weryfikację" }),
  }
);

const mapAnnouncementError = (error: ApplicationDependencyUnavailable) =>
  new AnnouncementPersistenceUnavailable({ operation: error.operation });

export const AnnouncementHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "announcement",
  (handlers) =>
    handlers
      .handle("createAnnouncement", ({ payload }) =>
        Effect.gen(function* createAnnouncementHandler() {
          const session = yield* requireAdminSession();
          yield* createAnnouncement({
            description: payload.description,
            title: payload.title,
            userId: session.user.id,
          }).pipe(Effect.mapError(mapAnnouncementError));
        })
      )
      .handle("deleteAnnouncement", ({ payload }) =>
        Effect.gen(function* deleteAnnouncementHandler() {
          yield* requireAdminSession();
          yield* deleteAnnouncement({ id: payload.id }).pipe(
            Effect.mapError(mapAnnouncementError)
          );
        })
      )
      .handle("listAnnouncements", () =>
        Effect.gen(function* listAnnouncementsHandler() {
          yield* requireVerifiedSession();
          return yield* listAnnouncements().pipe(
            Effect.mapError(mapAnnouncementError)
          );
        })
      )
);
