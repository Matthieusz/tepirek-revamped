/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { TodoStore } from "../../adapters/todo/todo-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  TodoForbidden,
  TodoUnauthorized,
} from "../../protocol/todo/http-api-contract.js";

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
): Effect.Effect<NonNullable<Session>, TodoUnauthorized | TodoForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* loadSession(request);

    if (!session?.user) {
      return yield* new TodoUnauthorized({ message: "UNAUTHORIZED" });
    }

    if (session.user.verified !== true) {
      return yield* new TodoForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }

    return session;
  });

export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle("createTodo", ({ payload, request }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* TodoStore;

          yield* store.create({ text: payload.text, userId: session.user.id });
        })
      )
      .handle("deleteTodo", ({ payload, request }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* TodoStore;

          yield* store.delete({ id: payload.id, userId: session.user.id });
        })
      )
      .handle("listTodos", ({ request }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* TodoStore;

          return yield* store.list({ userId: session.user.id });
        })
      )
      .handle("toggleTodo", ({ payload, request }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession(request);
          const store = yield* TodoStore;

          yield* store.toggle({
            completed: payload.completed,
            id: payload.id,
            userId: session.user.id,
          });
        })
      )
);
