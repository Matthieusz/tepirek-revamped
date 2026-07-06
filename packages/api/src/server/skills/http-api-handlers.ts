/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import {
  SkillsStore,
  SkillsStoreLayer,
} from "../../modules/skills/skills-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  SkillsForbidden,
  SkillsUnauthorized,
} from "../../protocol/skills/http-api-contract.js";

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
): Effect.Effect<NonNullable<Session>, SkillsUnauthorized | SkillsForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);
    if (!session?.user) {
      return yield* new SkillsUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new SkillsForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });
const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new SkillsForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

export const SkillsHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "skills",
  (handlers) =>
    handlers
      .handle("createProfession", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* SkillsStore;
          yield* store.createProfession(payload);
        })
      )
      .handle("createRange", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* SkillsStore;
          yield* store.createRange(payload);
        })
      )
      .handle("createSkill", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* SkillsStore;
          yield* store.createSkill({ ...payload, userId: session.user.id });
        })
      )
      .handle("deleteRange", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* SkillsStore;
          yield* store.deleteRange(payload);
        })
      )
      .handle("deleteSkill", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireAdminSession(request);
          const store = yield* SkillsStore;
          yield* store.deleteSkill(payload);
        })
      )
      .handle("listProfessions", ({ request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* SkillsStore;
          return yield* store.listProfessions();
        })
      )
      .handle("listRanges", ({ request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* SkillsStore;
          return yield* store.listRanges();
        })
      )
      .handle("getRangeBySlug", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* SkillsStore;
          return yield* store.getRangeBySlug(payload);
        })
      )
      .handle("listSkillsByRange", ({ payload, request }) =>
        Effect.gen(function* SkillsHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          const store = yield* SkillsStore;
          return yield* store.listSkillsByRange(payload);
        })
      )
).pipe(Layer.provide(SkillsStoreLayer));
