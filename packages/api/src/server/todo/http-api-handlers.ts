/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { TodoStore } from "../../adapters/todo/todo-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  TodoForbidden,
  TodoUnauthorized,
} from "../../protocol/todo/http-api-contract.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new TodoForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new TodoUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new TodoForbidden({
      message: "Konto oczekuje na weryfikację",
    }),
});

export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle("createTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store.create({ text: payload.text, userId: session.user.id });
        })
      )
      .handle("deleteTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store.delete({ id: payload.id, userId: session.user.id });
        })
      )
      .handle("listTodos", () =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          return yield* store.list({ userId: session.user.id });
        })
      )
      .handle("toggleTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store.toggle({
            completed: payload.completed,
            id: payload.id,
            userId: session.user.id,
          });
        })
      )
);
