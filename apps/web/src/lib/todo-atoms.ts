import type { TodoSummary } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

import { asTodoId } from "@/lib/branded-ids";
import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Todo = TodoSummary;

const removeTodoById = (
  todos: readonly Todo[],
  input: { readonly id: number }
) => todos.filter((todo) => todo.id !== input.id);

const toggleTodoById = (
  todos: readonly Todo[],
  input: { readonly completed: boolean; readonly id: number }
) =>
  todos.map((todo) =>
    todo.id === input.id ? { ...todo, completed: input.completed } : todo
  );

/** Resource atom for the current user's todos. */
export const todosAtom = appHttpApiAtom(
  Effect.gen(function* listTodosEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.todo.listTodos({});
  })
);

/** Mutation atom for creating a todo. */
export const createTodoAtom = appHttpApiFn(
  Effect.fn("Web.Todo.create")(function* createTodoEffect(
    payload: { readonly text: string },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const todo = yield* client.todo.createTodo({ payload });
    get.refresh(todosAtom);
    return todo;
  })
);

const deleteTodoRequestAtom = appHttpApiFn(
  Effect.fn("Web.Todo.delete")(function* deleteTodoEffect(input: {
    readonly id: number;
  }) {
    const client = yield* AppHttpApiClient;
    return yield* client.todo.deleteTodo({
      payload: { id: yield* asTodoId(input.id) },
    });
  })
);

const toggleTodoRequestAtom = appHttpApiFn(
  Effect.fn("Web.Todo.toggle")(function* toggleTodoEffect(input: {
    readonly completed: boolean;
    readonly id: number;
  }) {
    const client = yield* AppHttpApiClient;
    return yield* client.todo.toggleTodo({
      payload: {
        completed: input.completed,
        id: yield* asTodoId(input.id),
      },
    });
  })
);

/** Optimistic todo resource that preserves loading and failure states. */
export const optimisticTodosAtom = Atom.optimistic(todosAtom);

/** Optimistic mutation atom for deleting a todo from the list. */
export const deleteTodoAtom = optimisticTodosAtom.pipe(
  Atom.optimisticFn({
    fn: deleteTodoRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (todos) => removeTodoById(todos, input)),
  })
);

/** Optimistic mutation atom for toggling a todo completion state. */
export const toggleTodoAtom = optimisticTodosAtom.pipe(
  Atom.optimisticFn({
    fn: toggleTodoRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (todos) => toggleTodoById(todos, input)),
  })
);
