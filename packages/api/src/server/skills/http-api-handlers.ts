/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { SkillsStoreError } from "../../adapters/skills/skills-store-error.ts";
import { SkillsStore } from "../../adapters/skills/skills-store.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  SkillsForbidden,
  SkillsPersistenceUnavailable,
  SkillsUnauthorized,
} from "../../protocol/skills/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new SkillsForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new SkillsUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new SkillsForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

const projectStoreError = Effect.fn("SkillsHttpApiHandlers.projectStoreError")(
  (error: SkillsStoreError) =>
    Effect.fail(
      new SkillsPersistenceUnavailable({ operation: error.operation })
    )
);

export const SkillsHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "skills",
  (handlers) =>
    handlers
      .handle(
        "createProfession",
        Effect.fn("SkillsHttpApiHandlers.createProfession")(
          function* createProfession({ payload }) {
            yield* requireAdminSession();
            const store = yield* SkillsStore;
            yield* store
              .createProfession(payload)
              .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "createRange",
        Effect.fn("SkillsHttpApiHandlers.createRange")(function* createRange({
          payload,
        }) {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .createRange(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle(
        "createSkill",
        Effect.fn("SkillsHttpApiHandlers.createSkill")(function* createSkill({
          payload,
        }) {
          const session = yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          yield* store
            .createSkill({ ...payload, userId: session.user.id })
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle(
        "deleteRange",
        Effect.fn("SkillsHttpApiHandlers.deleteRange")(function* deleteRange({
          payload,
        }) {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .deleteRange(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle(
        "deleteSkill",
        Effect.fn("SkillsHttpApiHandlers.deleteSkill")(function* deleteSkill({
          payload,
        }) {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .deleteSkill(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle(
        "listProfessions",
        Effect.fn("SkillsHttpApiHandlers.listProfessions")(
          function* listProfessions() {
            yield* requireVerifiedSession();
            const store = yield* SkillsStore;
            return yield* store
              .listProfessions()
              .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "listRanges",
        Effect.fn("SkillsHttpApiHandlers.listRanges")(function* listRanges() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store
            .listRanges()
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle(
        "getRangeBySlug",
        Effect.fn("SkillsHttpApiHandlers.getRangeBySlug")(
          function* getRangeBySlug({ payload }) {
            yield* requireVerifiedSession();
            const store = yield* SkillsStore;
            return yield* store
              .getRangeBySlug(payload)
              .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
          }
        )
      )
      .handle(
        "listSkillsByRange",
        Effect.fn("SkillsHttpApiHandlers.listSkillsByRange")(
          function* listSkillsByRange({ payload }) {
            yield* requireVerifiedSession();
            const store = yield* SkillsStore;
            return yield* store
              .listSkillsByRange(payload)
              .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
          }
        )
      )
);
