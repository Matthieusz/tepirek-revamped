/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { and, eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { TodoId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { TodoSummary } from "../../protocol/todo/http-api-contract.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";
import { TodoStoreError } from "./todo-store-error.ts";

export interface CreateTodoInput {
  readonly text: string;
  readonly userId: AppUserId;
}

export interface DeleteTodoInput {
  readonly id: TodoId;
  readonly userId: AppUserId;
}

export interface ListTodosInput {
  readonly userId: AppUserId;
}

export interface ToggleTodoInput {
  readonly completed: boolean;
  readonly id: TodoId;
  readonly userId: AppUserId;
}

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new TodoStoreError(input)
);
const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown
) =>
  decodePersistedValue(
    schema,
    input,
    "listTodos.decode",
    (error) => new TodoStoreError(error)
  );

const createWithDatabase =
  (database: EffectPgDatabase) =>
  ({ text, userId }: CreateTodoInput) =>
    persistenceQuery(
      "createTodo",
      database.insert(todo).values({ text, userId })
    );

const deleteWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id, userId }: DeleteTodoInput) =>
    persistenceQuery(
      "deleteTodo",
      database.delete(todo).where(and(eq(todo.id, id), eq(todo.userId, userId)))
    );

const listWithDatabase =
  (database: EffectPgDatabase) =>
  ({ userId }: ListTodosInput) =>
    persistenceQuery(
      "listTodos",
      database.select().from(todo).where(eq(todo.userId, userId))
    ).pipe(
      Effect.flatMap((rows) =>
        Effect.all(
          rows.map((row) =>
            Effect.gen(function* decodeTodoRow() {
              const id = yield* decodePersisted(TodoId, row.id);
              const decodedUserId = yield* decodePersisted(
                AppUserId,
                row.userId
              );
              return { ...row, id, userId: decodedUserId };
            })
          )
        )
      )
    );

const toggleWithDatabase =
  (database: EffectPgDatabase) =>
  ({ completed, id, userId }: ToggleTodoInput) =>
    persistenceQuery(
      "toggleTodo",
      database
        .update(todo)
        .set({ completed })
        .where(and(eq(todo.id, id), eq(todo.userId, userId)))
    );

export class TodoStore extends Context.Service<
  TodoStore,
  {
    readonly create: (
      input: CreateTodoInput
    ) => Effect.Effect<void, TodoStoreError>;
    readonly delete: (
      input: DeleteTodoInput
    ) => Effect.Effect<void, TodoStoreError>;
    readonly list: (
      input: ListTodosInput
    ) => Effect.Effect<readonly TodoSummary[], TodoStoreError>;
    readonly toggle: (
      input: ToggleTodoInput
    ) => Effect.Effect<void, TodoStoreError>;
  }
>()("@tepirek-revamped/api/TodoStore") {}

export const TodoStoreLayer: Layer.Layer<TodoStore, never, EffectDatabase> =
  Layer.effect(
    TodoStore,
    EffectDatabase.useSync((database) =>
      TodoStore.of({
        create: Effect.fn("TodoStore.create")(createWithDatabase(database)),
        delete: Effect.fn("TodoStore.delete")(deleteWithDatabase(database)),
        list: Effect.fn("TodoStore.list")(listWithDatabase(database)),
        toggle: Effect.fn("TodoStore.toggle")(toggleWithDatabase(database)),
      })
    )
  );
