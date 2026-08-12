/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TodoTextSchema } from "@/features/todos/form-schemas";
import {
  createTodoAtom,
  deleteTodoAtom,
  optimisticTodosAtom,
  todosAtom,
  toggleTodoAtom,
} from "@/features/todos/todo-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import type { AuthSession } from "@/types/route";

interface TasksPageProps {
  session: AuthSession;
}

const TodoFormSchema = Schema.Struct({ text: TodoTextSchema });
const TodoFormValidator = Schema.toStandardSchemaV1(TodoFormSchema);

const runMutation = (
  action: () => Promise<unknown>,
  onSuccess?: () => void
) => {
  void (async () => {
    await action();
    onSuccess?.();
  })();
};

export default function TasksPage({ session }: TasksPageProps) {
  const todosResult = useAtomValue(todosAtom);
  const refreshTodos = useAtomRefresh(todosAtom);

  return (
    <AsyncResultBoundary onRetry={refreshTodos} result={todosResult}>
      {() => <TasksContent session={session} />}
    </AsyncResultBoundary>
  );
}

const TasksContent = ({ session }: TasksPageProps) => {
  const optimisticTodosResult = useAtomValue(optimisticTodosAtom);
  const todosData = AsyncResult.getOrThrow(optimisticTodosResult);
  const createTodo = useAtomSet(createTodoAtom, { mode: "promise" });
  const toggleTodo = useAtomSet(toggleTodoAtom, { mode: "promise" });
  const deleteTodo = useAtomSet(deleteTodoAtom, { mode: "promise" });
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const canCreateTodo = session.user.id.length > 0;
  const form = useAppForm({
    defaultValues: { text: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await TodoFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() => createTodo(decoded.value));
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Zadanie zostało dodane");
      form.reset();
    },
    validators: { onSubmit: TodoFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  const toggleTodoMutation = (input: { id: number; completed: boolean }) => {
    runMutation(async () => await toggleTodo(input));
  };
  const deleteTodoMutation = (input: { id: number }) => {
    runMutation(async () => await deleteTodo(input));
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleTodoMutation({ completed: !completed, id });
  };

  const handleDeleteTodo = (id: number) => {
    deleteTodoMutation({ id });
  };

  const completedCount = todosData.filter((t) => t.completed).length;
  const totalCount = todosData.length;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Lista zadań
        </h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj swoimi zadaniami do wykonania.
        </p>
      </div>

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground text-xs">
                Wszystkie
              </p>
              <ListTodo className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 font-bold text-2xl">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground text-xs">
                Ukończone
              </p>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            <p className="mt-1 font-bold text-2xl text-primary">
              {completedCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground text-xs">
                Pozostałe
              </p>
              <Circle className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-1 font-bold text-2xl text-muted-foreground">
              {totalCount - completedCount}
            </p>
          </div>
        </div>

        {/* Add Task */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-base">
            <Plus className="size-4" />
            Dodaj zadanie
          </h2>
          <p className="mb-4 text-muted-foreground text-sm">
            Wpisz treść nowego zadania
          </p>
          <form.AppForm>
            <FormFeedback failure={submissionFailure} />
            <Form className="flex items-start gap-2" form={form}>
              <form.AppField name="text">
                {(field) => (
                  <field.TextField
                    className="flex-1"
                    disabled={!canCreateTodo || isSubmitting}
                    label="Treść nowego zadania"
                    placeholder="np. zrobić porządek na postaciach (pozdro Wolan)"
                    required
                  />
                )}
              </form.AppField>
              <Button disabled={!canCreateTodo || isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Dodaj"
                )}
              </Button>
            </Form>
          </form.AppForm>
        </div>

        {/* Task List */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <ListTodo className="size-4" />
            <h2 className="font-semibold text-base">Twoje zadania</h2>
            <span className="ml-auto text-muted-foreground text-sm">
              {totalCount > 0
                ? `${completedCount} z ${totalCount} ukończonych`
                : "Brak zadań"}
            </span>
          </div>
          <div className="p-4">
            {todosData.length === 0 && (
              <div className="rounded-lg border border-dashed py-8 text-center">
                <ListTodo className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground text-sm">
                  Brak zadań do wyświetlenia
                </p>
                <p className="text-muted-foreground text-xs">
                  Dodaj nowe zadanie powyżej
                </p>
              </div>
            )}
            {todosData.length > 0 && (
              <ul className="space-y-2">
                {todosData.map((todo) => (
                  <li
                    className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                      todo.completed
                        ? "bg-primary/10"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    key={todo.id}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={todo.completed}
                        id={`todo-${todo.id}`}
                        onCheckedChange={() => {
                          handleToggleTodo(todo.id, todo.completed);
                        }}
                      />
                      <label
                        className={`cursor-pointer text-sm ${
                          todo.completed
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                        htmlFor={`todo-${todo.id}`}
                      >
                        {todo.text}
                      </label>
                    </div>
                    <Button
                      aria-label="Usuń zadanie"
                      onClick={() => {
                        handleDeleteTodo(todo.id);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
