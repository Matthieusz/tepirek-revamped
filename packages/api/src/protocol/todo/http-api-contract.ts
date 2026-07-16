/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { TodoIdSchema } from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { TodoIdSchema };

export const CreateTodoPayload = Schema.Struct({
  text: Schema.NonEmptyString,
});

export const DeleteTodoPayload = Schema.Struct({
  id: TodoIdSchema,
});

export const ToggleTodoPayload = Schema.Struct({
  completed: Schema.Boolean,
  id: TodoIdSchema,
});

export const TodoSummary = Schema.Struct({
  completed: Schema.Boolean,
  id: TodoIdSchema,
  text: Schema.String,
  userId: AppUserIdSchema,
});

export class TodoUnauthorized extends Schema.TaggedErrorClass<TodoUnauthorized>()(
  "TodoUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class TodoForbidden extends Schema.TaggedErrorClass<TodoForbidden>()(
  "TodoForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class TodoPersistenceUnavailable extends Schema.TaggedErrorClass<TodoPersistenceUnavailable>()(
  "TodoPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const TodoError = Schema.Union([
  TodoUnauthorized,
  TodoForbidden,
  TodoPersistenceUnavailable,
]);

export const TodoHttpApiGroup = HttpApiGroup.make("todo")
  .add(
    HttpApiEndpoint.post("createTodo", "/", {
      error: TodoError,
      payload: CreateTodoPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.post("deleteTodo", "/delete", {
      error: TodoError,
      payload: DeleteTodoPayload,
      success: Schema.Void,
    }),
    HttpApiEndpoint.get("listTodos", "/", {
      error: TodoError,
      success: Schema.Array(TodoSummary),
    }),
    HttpApiEndpoint.post("toggleTodo", "/toggle", {
      error: TodoError,
      payload: ToggleTodoPayload,
      success: Schema.Void,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/todos");
