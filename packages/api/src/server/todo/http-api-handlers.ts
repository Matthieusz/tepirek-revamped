/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { TodoStoreError } from "../../adapters/todo/todo-store-error.js";
import { TodoStore } from "../../adapters/todo/todo-store.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  TodoForbidden,
  TodoPersistenceUnavailable,
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

const projectStoreError = Effect.fn("TodoHttpApiHandlers.projectStoreError")(
  (error: TodoStoreError) =>
    Effect.gen(function* projectStoreError() {
      yield* Effect.logError("Todo persistence operation failed").pipe(
        Effect.annotateLogs({
          errorTag: error._tag,
          operation: error.operation,
        })
      );
      return yield* new TodoPersistenceUnavailable({
        operation: error.operation,
      });
    })
);

export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle("createTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store
            .create({ text: payload.text, userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle("deleteTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          yield* store
            .delete({ id: payload.id, userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle("listTodos", () =>
        Effect.gen(function* TodoHttpApiHandlers() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;

          return yield* store
            .list({ userId: session.user.id })
            .pipe(Effect.catchTag("TodoStoreError", projectStoreError));
        })
      )
      .handle("toggleTodo", ({ payload }) =>
        Effect.gen(function* TodoHttpApiHandlers() {
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
