import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { TodoId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { ApplicationDependencyUnavailable } from "../application-errors.ts";

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
export interface TodoSummary {
  readonly completed: boolean;
  readonly id: TodoId;
  readonly text: string;
  readonly userId: AppUserId;
}

/** Persistence port for todo use cases. */
export class TodoStore extends Context.Service<
  TodoStore,
  {
    readonly create: (
      input: CreateTodoInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly delete: (
      input: DeleteTodoInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly list: (
      input: ListTodosInput
    ) => Effect.Effect<
      readonly TodoSummary[],
      ApplicationDependencyUnavailable
    >;
    readonly toggle: (
      input: ToggleTodoInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
  }
>()("@tepirek-revamped/api/TodoStore") {}
