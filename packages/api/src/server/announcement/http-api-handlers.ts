/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AnnouncementStore } from "../../adapters/announcement/announcement-store.js";
import {
  AnnouncementForbidden,
  AnnouncementUnauthorized,
} from "../../protocol/announcement/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

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

export const AnnouncementHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "announcement",
  (handlers) =>
    handlers
      .handle("createAnnouncement", ({ payload }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          const session = yield* requireAdminSession();
          const store = yield* AnnouncementStore;

          yield* store.create({
            description: payload.description,
            title: payload.title,
            userId: session.user.id,
          });
        })
      )
      .handle("deleteAnnouncement", ({ payload }) =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* AnnouncementStore;

          yield* store.delete({ id: payload.id });
        })
      )
      .handle("listAnnouncements", () =>
        Effect.gen(function* AnnouncementHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* AnnouncementStore;

          return yield* store.list();
        })
      )
);
