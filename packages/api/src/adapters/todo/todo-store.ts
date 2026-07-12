/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { and, eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeDirectPersistenceQuery } from "../persistence-query.js";
import { TodoStoreError } from "./todo-store-error.js";

export interface CreateTodoInput {
  readonly text: string;
  readonly userId: string;
}

export interface DeleteTodoInput {
  readonly id: number;
  readonly userId: string;
}

export interface ListTodosInput {
  readonly userId: string;
}

export interface ToggleTodoInput {
  readonly completed: boolean;
  readonly id: number;
  readonly userId: string;
}

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new TodoStoreError(input)
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
    readonly list: (input: ListTodosInput) => Effect.Effect<
      readonly {
        readonly completed: boolean;
        readonly id: number;
        readonly text: string;
        readonly userId: string;
      }[],
      TodoStoreError
    >;
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
