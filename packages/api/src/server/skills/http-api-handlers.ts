import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  SkillsBadRequest,
  SkillsConflict,
  SkillsForbidden,
  SkillsPersistenceUnavailable,
  SkillsUnauthorized,
} from "../../protocol/skills/http-api-contract.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationInvalidInput,
} from "../../services/application-errors.ts";
import {
  createProfession,
  createRange,
  createSkill,
  deleteRange,
  deleteSkill,
  getRangeBySlug,
  listProfessions,
  listRanges,
  listSkillsByRange,
} from "../../services/skills/skills-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new SkillsForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new SkillsUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new SkillsForbidden({ message: "Konto oczekuje na weryfikację" }),
  }
);
const mapSkillsError = (
  error:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationInvalidInput
) => {
  switch (error._tag) {
    case "ApplicationConflict": {
      return new SkillsConflict({ message: error.message });
    }
    case "ApplicationInvalidInput": {
      return new SkillsBadRequest({ message: error.message });
    }
    case "ApplicationDependencyUnavailable": {
      return new SkillsPersistenceUnavailable({ operation: error.operation });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const SkillsHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "skills",
  (handlers) =>
    handlers
      .handle("createProfession", ({ payload }) =>
        Effect.gen(function* createProfessionHandler() {
          yield* requireAdminSession();
          yield* createProfession(payload).pipe(
            Effect.mapError(mapSkillsError)
          );
        })
      )
      .handle("createRange", ({ payload }) =>
        Effect.gen(function* createRangeHandler() {
          yield* requireAdminSession();
          yield* createRange(payload).pipe(Effect.mapError(mapSkillsError));
        })
      )
      .handle("createSkill", ({ payload }) =>
        Effect.gen(function* createSkillHandler() {
          const session = yield* requireVerifiedSession();
          yield* createSkill({ ...payload, userId: session.user.id }).pipe(
            Effect.mapError(mapSkillsError)
          );
        })
      )
      .handle("deleteRange", ({ payload }) =>
        Effect.gen(function* deleteRangeHandler() {
          yield* requireAdminSession();
          yield* deleteRange(payload).pipe(Effect.mapError(mapSkillsError));
        })
      )
      .handle("deleteSkill", ({ payload }) =>
        Effect.gen(function* deleteSkillHandler() {
          yield* requireAdminSession();
          yield* deleteSkill(payload).pipe(Effect.mapError(mapSkillsError));
        })
      )
      .handle("listProfessions", () =>
        Effect.gen(function* listProfessionsHandler() {
          yield* requireVerifiedSession();
          return yield* listProfessions().pipe(Effect.mapError(mapSkillsError));
        })
      )
      .handle("listRanges", () =>
        Effect.gen(function* listRangesHandler() {
          yield* requireVerifiedSession();
          return yield* listRanges().pipe(Effect.mapError(mapSkillsError));
        })
      )
      .handle("getRangeBySlug", ({ payload }) =>
        Effect.gen(function* getRangeBySlugHandler() {
          yield* requireVerifiedSession();
          return yield* getRangeBySlug(payload).pipe(
            Effect.mapError(mapSkillsError)
          );
        })
      )
      .handle("listSkillsByRange", ({ payload }) =>
        Effect.gen(function* listSkillsByRangeHandler() {
          yield* requireVerifiedSession();
          return yield* listSkillsByRange(payload).pipe(
            Effect.mapError(mapSkillsError)
          );
        })
      )
);
