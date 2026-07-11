/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { SessionMiddleware } from "../auth/http-api-middleware.js";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const TodoIdSchema = PositiveInt.annotate({ identifier: "TodoId" });

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
  userId: Schema.String,
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
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  },
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
