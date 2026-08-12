import * as Effect from "effect/Effect";

import { TodoStore } from "./todo-store.ts";

export const createTodo = Effect.fn("Todo.create")(function* createTodo(
  input: Parameters<(typeof TodoStore.Service)["create"]>[0]
) {
  const store = yield* TodoStore;
  yield* store.create(input);
});

export const deleteTodo = Effect.fn("Todo.delete")(function* deleteTodo(
  input: Parameters<(typeof TodoStore.Service)["delete"]>[0]
) {
  const store = yield* TodoStore;
  yield* store.delete(input);
});

export const listTodos = Effect.fn("Todo.list")(function* listTodos(
  input: Parameters<(typeof TodoStore.Service)["list"]>[0]
) {
  const store = yield* TodoStore;
  return yield* store.list(input);
});

export const toggleTodo = Effect.fn("Todo.toggle")(function* toggleTodo(
  input: Parameters<(typeof TodoStore.Service)["toggle"]>[0]
) {
  const store = yield* TodoStore;
  yield* store.toggle(input);
});
