/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { and, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { TodoId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { TodoStore } from "../../services/todo/todo-store.ts";
import type {
  CreateTodoInput,
  DeleteTodoInput,
  ListTodosInput,
  ToggleTodoInput,
} from "../../services/todo/todo-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);
const decodePersisted = <A>(schema: Schema.ConstraintDecoder<A>) =>
  decodePersistedValue(
    schema,
    "listTodos.decode",
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
    (error) => new ApplicationDependencyUnavailable(error)
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
        // oxlint-disable-next-line unicorn/no-array-for-each unicorn/no-array-method-this-argument -- Effect.forEach sequences typed effects; this is not Array#forEach.
        Effect.forEach(rows, (row) =>
          Effect.gen(function* decodeTodoRow() {
            const id = yield* decodePersisted(TodoId)(row.id);
            const decodedUserId = yield* decodePersisted(AppUserId)(row.userId);
            return { ...row, id, userId: decodedUserId };
          })
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

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const TodoStoreLayer: Layer.Layer<TodoStore, never, EffectDatabase> =
  Layer.effect(
    TodoStore,
    getDatabaseSync((database) =>
      TodoStore.of({
        create: Effect.fn("TodoStore.create")(createWithDatabase(database)),
        delete: Effect.fn("TodoStore.delete")(deleteWithDatabase(database)),
        list: Effect.fn("TodoStore.list")(listWithDatabase(database)),
        toggle: Effect.fn("TodoStore.toggle")(toggleWithDatabase(database)),
      })
    )
  );
