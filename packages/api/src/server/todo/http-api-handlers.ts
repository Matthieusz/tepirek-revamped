import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  TodoForbidden,
  TodoPersistenceUnavailable,
  TodoUnauthorized,
} from "../../protocol/todo/http-api-contract.ts";
import type { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
} from "../../services/todo/todo-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireVerifiedSession } = makeAuthorizationPolicy({
  forbidden: () => new TodoForbidden({ message: "FORBIDDEN" }),
  unauthorized: () => new TodoUnauthorized({ message: "UNAUTHORIZED" }),
  unverified: () =>
    new TodoForbidden({ message: "Konto oczekuje na weryfikację" }),
});
const mapTodoError = (error: ApplicationDependencyUnavailable) =>
  new TodoPersistenceUnavailable({ operation: error.operation });

export const TodoHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "todo",
  (handlers) =>
    handlers
      .handle("createTodo", ({ payload }) =>
        Effect.gen(function* createTodoHandler() {
          const session = yield* requireVerifiedSession();
          yield* createTodo({
            text: payload.text,
            userId: session.user.id,
          }).pipe(Effect.mapError(mapTodoError));
        })
      )
      .handle("deleteTodo", ({ payload }) =>
        Effect.gen(function* deleteTodoHandler() {
          const session = yield* requireVerifiedSession();
          yield* deleteTodo({ id: payload.id, userId: session.user.id }).pipe(
            Effect.mapError(mapTodoError)
          );
        })
      )
      .handle("listTodos", () =>
        Effect.gen(function* listTodosHandler() {
          const session = yield* requireVerifiedSession();
          return yield* listTodos({ userId: session.user.id }).pipe(
            Effect.mapError(mapTodoError)
          );
        })
      )
      .handle("toggleTodo", ({ payload }) =>
        Effect.gen(function* toggleTodoHandler() {
          const session = yield* requireVerifiedSession();
          yield* toggleTodo({
            completed: payload.completed,
            id: payload.id,
            userId: session.user.id,
          }).pipe(Effect.mapError(mapTodoError));
        })
      )
);
