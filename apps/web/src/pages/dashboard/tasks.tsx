/* oxlint-disable no-use-before-define */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import type { CreateTodoPayload } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TodoTextSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import {
  createTodoAtom,
  deleteTodoAtom,
  optimisticTodosAtom,
  todosAtom,
  toggleTodoAtom,
} from "@/lib/todo-atoms";
import type { AuthSession } from "@/types/route";

interface TasksPageProps {
  session: AuthSession;
}

const todoFormBuilder = FormBuilder.empty.addField("text", TodoTextSchema);

type CreateTodo = (payload: CreateTodoPayload) => Promise<unknown>;

const todoForm = FormReact.make(todoFormBuilder, {
  fields: { text: EffectTextField },
  mode: { validation: "onSubmit" },
  onSubmit: (createTodo: CreateTodo, { decoded }) =>
    formSubmission(() => createTodo(decoded)),
});

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
  const submit = useAtomSet(todoForm.submit, { mode: "promise" });
  const reset = useAtomSet(todoForm.reset);
  const submitResult = useAtomValue(todoForm.submit);
  const isDirty = useAtomValue(todoForm.isDirty);
  useEffectFormProtection(isDirty, submitResult.waiting);
  const canCreateTodo = session.user.id.length > 0;

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Zadanie zostało dodane");
      reset();
    }
  }, [reset, submitResult]);

  const handleCreateTodo = async (): Promise<void> => {
    try {
      await submit(createTodo);
    } catch {
      // Effect Form owns the persistent failure message and keeps the draft.
    }
  };

  const toggleTodoMutation = (input: { id: number; completed: boolean }) =>
    runMutation(() => toggleTodo(input));
  const deleteTodoMutation = (input: { id: number }) =>
    runMutation(() => deleteTodo(input));

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
          <todoForm.Initialize defaultValues={{ text: "" }}>
            <EffectFormFeedback result={submitResult} />
            <EffectForm
              action={handleCreateTodo}
              className="flex items-start gap-2"
              submitResult={submitResult}
            >
              <todoForm.text
                className="flex-1"
                disabled={!canCreateTodo || submitResult.waiting}
                label="Treść nowego zadania"
                placeholder="np. zrobić porządek na postaciach (pozdro Wolan)"
                required
              />
              <Button
                disabled={!canCreateTodo || submitResult.waiting}
                type="submit"
              >
                {submitResult.waiting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Dodaj"
                )}
              </Button>
            </EffectForm>
          </todoForm.Initialize>
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
