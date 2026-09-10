import type {
  CreateTodoPayload,
  TodoSummary,
} from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import { Effect } from "effect";

import { asTodoId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Input for a todo mutation that targets one todo. */
export interface TodoIdInput {
  readonly id: number;
}

/** Input for changing one todo's completion state. */
export interface ToggleTodoInput extends TodoIdInput {
  readonly completed: boolean;
}

/** Effect that lists the current user's todos. */
export const listTodos = Effect.fn("Web.Todo.list")(
  function* listTodosEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.todo.listTodos({});
  }
);

/** Effect that creates a todo for the current user. */
export const createTodo = Effect.fn("Web.Todo.create")(
  function* createTodoEffect(payload: CreateTodoPayload) {
    const client = yield* AppHttpApiClient;

    return yield* client.todo.createTodo({ payload });
  }
);

/** Effect that deletes one todo after decoding its browser-provided ID. */
export const deleteTodo = Effect.fn("Web.Todo.delete")(
  function* deleteTodoEffect(input: TodoIdInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.todo.deleteTodo({
      payload: { id: yield* asTodoId(input.id) },
    });
  }
);

/** Effect that toggles one todo after decoding its browser-provided ID. */
export const toggleTodo = Effect.fn("Web.Todo.toggle")(
  function* toggleTodoEffect(input: ToggleTodoInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.todo.toggleTodo({
      payload: {
        completed: input.completed,
        id: yield* asTodoId(input.id),
      },
    });
  }
);

/** Promise runner type used by todo query and mutation adapters. */
export type TodoApiRunner = typeof runAppHttpApi;

/** Todo data returned by the list query. */
export type Todo = TodoSummary;
