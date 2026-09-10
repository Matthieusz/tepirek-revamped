import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
} from "@/features/todos/todo-api";
import type {
  Todo,
  TodoApiRunner,
  TodoIdInput,
  ToggleTodoInput,
} from "@/features/todos/todo-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Shared cache key for the current user's todo list. */
export const todosQueryKey = ["todos"] as const;

type TodoMutationError = Error;

interface TodoMutationCallbacks {
  readonly onError?: (error: TodoMutationError) => void;
  readonly onRefreshError?: (error: TodoMutationError) => void;
}

const hasConcurrentTodoMutation = (queryClient: QueryClient) =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === todosQueryKey[0]
    ).length > 1;

const invalidateTodos = async (
  queryClient: QueryClient,
  callbacks: TodoMutationCallbacks
): Promise<void> => {
  try {
    await queryClient.invalidateQueries(
      { queryKey: todosQueryKey },
      { throwOnError: true }
    );
  } catch (error: unknown) {
    const refreshError =
      error instanceof Error ? error : new Error("Todo list refresh failed");

    callbacks.onRefreshError?.(refreshError);
  }
};

const invalidateTodosAfterMutation = async (
  queryClient: QueryClient,
  callbacks: TodoMutationCallbacks
): Promise<void> => {
  if (hasConcurrentTodoMutation(queryClient)) {
    return;
  }

  await invalidateTodos(queryClient, callbacks);
};

const replaceTodo = (
  todos: readonly Todo[] | undefined,
  input: TodoIdInput,
  replacement: Todo
): readonly Todo[] | undefined =>
  todos?.map((todo) => (todo.id === input.id ? replacement : todo));

/** Returns the Query options for the current user's todos. */
export const todosQueryOptions = (runner: TodoApiRunner = runAppHttpApi) =>
  queryOptions({
    queryFn: async ({ signal }) => await runner(listTodos(), { signal }),
    queryKey: todosQueryKey,
  });

/** Returns mutation options for creating a todo and refreshing the list. */
export const createTodoMutationOptions = (
  queryClient: QueryClient,
  runner: TodoApiRunner = runAppHttpApi,
  callbacks: TodoMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof createTodo>[0]) => {
      await runner(createTodo(payload));
    },
    mutationKey: todosQueryKey,
    onError: (error: TodoMutationError) => {
      callbacks.onError?.(error);
    },
    onSuccess: async () => {
      await invalidateTodosAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for toggling a todo. */
export const toggleTodoMutationOptions = (
  queryClient: QueryClient,
  runner: TodoApiRunner = runAppHttpApi,
  callbacks: TodoMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: ToggleTodoInput) => {
      await runner(toggleTodo(input));
    },
    mutationKey: todosQueryKey,
    onError: (
      error: TodoMutationError,
      input: ToggleTodoInput,
      context: { readonly previousTodo: Todo | undefined } | undefined
    ) => {
      const previousTodo = context?.previousTodo;

      if (previousTodo !== undefined) {
        queryClient.setQueryData<readonly Todo[]>(todosQueryKey, (todos) =>
          replaceTodo(todos, input, previousTodo)
        );
      }

      callbacks.onError?.(error);
    },
    onMutate: async (input: ToggleTodoInput) => {
      await queryClient.cancelQueries({ queryKey: todosQueryKey });

      const previousTodo = queryClient
        .getQueryData<readonly Todo[]>(todosQueryKey)
        ?.find((todo) => todo.id === input.id);

      queryClient.setQueryData<readonly Todo[]>(todosQueryKey, (todos) =>
        todos?.map((todo) =>
          todo.id === input.id ? { ...todo, completed: input.completed } : todo
        )
      );

      return { previousTodo };
    },
    onSettled: async () => {
      await invalidateTodosAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting a todo. */
export const deleteTodoMutationOptions = (
  queryClient: QueryClient,
  runner: TodoApiRunner = runAppHttpApi,
  callbacks: TodoMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: TodoIdInput) => {
      await runner(deleteTodo(input));
    },
    mutationKey: todosQueryKey,
    onError: (
      error: TodoMutationError,
      input: TodoIdInput,
      context:
        | {
            readonly index: number;
            readonly previousTodo: Todo | undefined;
          }
        | undefined
    ) => {
      const previousTodo = context?.previousTodo;
      const previousIndex = context?.index ?? 0;

      if (previousTodo !== undefined) {
        queryClient.setQueryData<readonly Todo[]>(todosQueryKey, (todos) => {
          if (
            todos === undefined ||
            todos.some((todo) => todo.id === input.id)
          ) {
            return todos;
          }

          const index = Math.min(previousIndex, todos.length);

          return [
            ...todos.slice(0, index),
            previousTodo,
            ...todos.slice(index),
          ];
        });
      }

      callbacks.onError?.(error);
    },
    onMutate: async (input: TodoIdInput) => {
      await queryClient.cancelQueries({ queryKey: todosQueryKey });
      const todos = queryClient.getQueryData<readonly Todo[]>(todosQueryKey);
      const index = todos?.findIndex((todo) => todo.id === input.id) ?? -1;

      const previousTodo =
        index >= 0 && todos !== undefined ? todos[index] : undefined;

      queryClient.setQueryData<readonly Todo[]>(todosQueryKey, (current) =>
        current?.filter((todo) => todo.id !== input.id)
      );

      return { index: Math.max(index, 0), previousTodo };
    },
    onSettled: async () => {
      await invalidateTodosAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });
