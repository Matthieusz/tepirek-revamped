/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { SkillsStore } from "../../adapters/skills/skills-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  SkillsForbidden,
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

export const SkillsHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "skills",
  (handlers) =>
    handlers
      .handle("createProfession", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store.createProfession(payload);
        })
      )
      .handle("createRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store.createRange(payload);
        })
      )
      .handle("createSkill", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          yield* store.createSkill({ ...payload, userId: session.user.id });
        })
      )
      .handle("deleteRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store.deleteRange(payload);
        })
      )
      .handle("deleteSkill", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession();
          const store = yield* SkillsStore;
          yield* store.deleteSkill(payload);
        })
      )
      .handle("listProfessions", () =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store.listProfessions();
        })
      )
      .handle("listRanges", () =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store.listRanges();
        })
      )
      .handle("getRangeBySlug", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store.getRangeBySlug(payload);
        })
      )
      .handle("listSkillsByRange", ({ payload }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession();
          const store = yield* SkillsStore;
          return yield* store.listSkillsByRange(payload);
        })
      )
);
