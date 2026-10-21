import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/http-api";

import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  TodoForbidden,
  TodoPersistenceUnavailable,
  TodoUnauthorized,
} from "../../protocol/todo/http-api-contract.ts";
import type { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { TodoStore } from "../../services/todo/todo-store.ts";
import { buildAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireVerifiedSession } = buildAuthorizationPolicy({
  forbidden: () => new TodoForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new TodoUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new TodoForbidden({ message: "Konto oczekuje na weryfikację" }),
});

const mapTodoError = (error: ApplicationDependencyUnavailable) =>
  new TodoPersistenceUnavailable({ operation: error.operation });

/** Todo transport handlers; operation spans wrap persistence calls after authorization. */
export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle("createTodo", ({ payload }) =>
        Effect.gen(function* createTodoHandler() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;
          yield* store
            .create({
              text: payload.text,
              userId: session.user.id,
            })
            .pipe(
              Effect.withSpan("Todo.create"),
              Effect.mapError(mapTodoError)
            );
        })
      )
      .handle("deleteTodo", ({ payload }) =>
        Effect.gen(function* deleteTodoHandler() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;
          yield* store
            .delete({ id: payload.id, userId: session.user.id })
            .pipe(
              Effect.withSpan("Todo.delete"),
              Effect.mapError(mapTodoError)
            );
        })
      )
      .handle("listTodos", () =>
        Effect.gen(function* listTodosHandler() {
          const session = yield* requireVerifiedSession();

          const store = yield* TodoStore;

          return yield* store
            .list({ userId: session.user.id })
            .pipe(Effect.withSpan("Todo.list"), Effect.mapError(mapTodoError));
        })
      )
      .handle("toggleTodo", ({ payload }) =>
        Effect.gen(function* toggleTodoHandler() {
          const session = yield* requireVerifiedSession();
          const store = yield* TodoStore;
          yield* store
            .toggle({
              completed: payload.completed,
              id: payload.id,
              userId: session.user.id,
            })
            .pipe(
              Effect.withSpan("Todo.toggle"),
              Effect.mapError(mapTodoError)
            );
        })
      )
);
