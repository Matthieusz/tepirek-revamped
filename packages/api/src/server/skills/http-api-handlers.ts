/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { SkillsStoreError } from "../../adapters/skills/skills-store-error.js";
import { SkillsStore } from "../../adapters/skills/skills-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  SkillsForbidden,
  SkillsPersistenceUnavailable,
  SkillsUnauthorized,
} from "../../protocol/skills/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

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
    Effect.gen(function* projectStoreError() {
      yield* Effect.logError("Skills persistence operation failed").pipe(
        Effect.annotateLogs({
          errorTag: error._tag,
          operation: error.operation,
        })
      );
      return yield* new SkillsPersistenceUnavailable({
        operation: error.operation,
      });
    })
);

export const SkillsHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "skills",
  (handlers) =>
    handlers
      .handle("createProfession", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .createProfession(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("createRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .createRange(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("createSkill", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          yield* store
            .createSkill({ ...payload, userId: session.user.id })
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("deleteRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .deleteRange(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("deleteSkill", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store
            .deleteSkill(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("listProfessions", () =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store
            .listProfessions()
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("listRanges", () =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store
            .listRanges()
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("getRangeBySlug", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store
            .getRangeBySlug(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
      .handle("listSkillsByRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store
            .listSkillsByRange(payload)
            .pipe(Effect.catchTag("SkillsStoreError", projectStoreError));
        })
      )
);
