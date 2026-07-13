/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { TodoStoreError } from "../../adapters/todo/todo-store-error.ts";
import { TodoStore } from "../../adapters/todo/todo-store.ts";
import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  TodoForbidden,
  TodoPersistenceUnavailable,
  TodoUnauthorized,
} from "../../protocol/todo/http-api-contract.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new TodoForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new TodoUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new TodoForbidden({
      message: "Konto oczekuje na weryfikację",
    }),
});

const projectStoreError = Effect.fn("TodoHttpApiHandlers.projectStoreError")(
  (error: TodoStoreError) =>
    Effect.fail(new TodoPersistenceUnavailable({ operation: error.operation }))
);

export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle(
        "createTodo",
        Effect.fn("TodoHttpApiHandlers.createTodo")(function* createTodo({
          payload,
        }) {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store
            .create({ text: payload.text, userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle(
        "deleteTodo",
        Effect.fn("TodoHttpApiHandlers.deleteTodo")(function* deleteTodo({
          payload,
        }) {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store
            .delete({ id: payload.id, userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle(
        "listTodos",
        Effect.fn("TodoHttpApiHandlers.listTodos")(function* listTodos() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          return yield* store
            .list({ userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle(
        "toggleTodo",
        Effect.fn("TodoHttpApiHandlers.toggleTodo")(function* toggleTodo({
          payload,
        }) {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store
            .toggle({
              completed: payload.completed,
              id: payload.id,
              userId: session.user.id,
            })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
);
