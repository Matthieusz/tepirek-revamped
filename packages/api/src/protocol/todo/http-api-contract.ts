/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
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
export interface CreateTodoPayload extends Schema.Schema.Type<
  typeof CreateTodoPayload
> {}

export const DeleteTodoPayload = Schema.Struct({
  id: TodoIdSchema,
});
export interface DeleteTodoPayload extends Schema.Schema.Type<
  typeof DeleteTodoPayload
> {}

export const ToggleTodoPayload = Schema.Struct({
  completed: Schema.Boolean,
  id: TodoIdSchema,
});
export interface ToggleTodoPayload extends Schema.Schema.Type<
  typeof ToggleTodoPayload
> {}

export const TodoSummary = Schema.Struct({
  completed: Schema.Boolean,
  id: TodoIdSchema,
  text: Schema.String,
  userId: AppUserIdSchema,
});
export interface TodoSummary extends Schema.Schema.Type<typeof TodoSummary> {}

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
