import { Atom, Result } from "@effect-atom/atom-react";
import type { TodoSummary } from "@tepirek-revamped/api/modules/todo/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Todo = typeof TodoSummary.Type;

const emptyTodos: readonly Todo[] = [];

const getTodoListOrEmpty = (result: Result.Result<readonly Todo[], unknown>) =>
  Result.isSuccess(result) ? result.value : emptyTodos;

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
  (payload: { readonly text: string }) =>
    Effect.gen(function* createTodoEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.todo.createTodo({ payload });
    })
);

const deleteTodoRequestAtom = appHttpApiFn((payload: { readonly id: number }) =>
  Effect.gen(function* deleteTodoEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.todo.deleteTodo({ payload });
  })
);

const toggleTodoRequestAtom = appHttpApiFn(
  (payload: { readonly completed: boolean; readonly id: number }) =>
    Effect.gen(function* toggleTodoEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.todo.toggleTodo({ payload });
    })
);

/** Optimistic todo list atom backed by the Result-returning todos resource. */
export const optimisticTodosAtom = Atom.optimistic(
  todosAtom.pipe(Atom.map(getTodoListOrEmpty))
);

/** Optimistic mutation atom for deleting a todo from the list. */
export const deleteTodoAtom = optimisticTodosAtom.pipe(
  Atom.optimisticFn({
    fn: deleteTodoRequestAtom,
    reducer: removeTodoById,
  })
);

/** Optimistic mutation atom for toggling a todo completion state. */
export const toggleTodoAtom = optimisticTodosAtom.pipe(
  Atom.optimisticFn({
    fn: toggleTodoRequestAtom,
    reducer: toggleTodoById,
  })
);
