import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
  staticData: {
    crumb: "Zadania",
  },
});

function TasksRoute() {
  const { session } = Route.useRouteContext();
  const [newTodoText, setNewTodoText] = useState("");
  const queryClient = useQueryClient();

  const todos = useQuery(orpc.todo.getAll.queryOptions());
  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.queryKey(),
        });
        setNewTodoText("");
      },
    })
  );
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.queryKey(),
        });
      },
    })
  );
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.todo.getAll.queryKey(),
        });
      },
    })
  );

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim() && session.id) {
      createMutation.mutate({ text: newTodoText, userId: session.id });
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const completedCount = todos.data?.filter((t) => t.completed).length ?? 0;
  const totalCount = todos.data?.length ?? 0;

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h1 className="mb-1 font-bold text-2xl tracking-tight">Lista zadań</h1>
        <p className="text-muted-foreground text-sm">
          Zarządzaj swoimi zadaniami do wykonania.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center justify-between font-medium text-muted-foreground text-xs">
              Wszystkie
              <ListTodo className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-bold text-2xl">
              {todos.isLoading ? "—" : totalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center justify-between font-medium text-muted-foreground text-xs">
              Ukończone
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-bold text-2xl text-green-500">
              {todos.isLoading ? "—" : completedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center justify-between font-medium text-muted-foreground text-xs">
              Pozostałe
              <Circle className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-bold text-2xl text-yellow-500">
              {todos.isLoading ? "—" : totalCount - completedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Task */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Dodaj zadanie
          </CardTitle>
          <CardDescription>Wpisz treść nowego zadania</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={handleAddTodo}>
            <Input
              className="flex-1"
              disabled={createMutation.isPending}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="np. zrobić porządek na postkach (pzdr Ukasz)"
              value={newTodoText}
            />
            <Button
              disabled={createMutation.isPending || !newTodoText.trim()}
              type="submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Dodaj"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            Twoje zadania
          </CardTitle>
          <CardDescription>
            {totalCount > 0
              ? `${completedCount} z ${totalCount} ukończonych`
              : "Brak zadań na liście"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todos.isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!todos.isLoading && todos.data?.length === 0 && (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <ListTodo className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground text-sm">
                Brak zadań do wyświetlenia
              </p>
              <p className="text-muted-foreground text-xs">
                Dodaj nowe zadanie powyżej
              </p>
            </div>
          )}
          {!todos.isLoading && todos.data && todos.data.length > 0 && (
            <ul className="space-y-2">
              {todos.data.map((todo) => (
                <li
                  className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                    todo.completed
                      ? "bg-green-500/10"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  key={todo.id}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={todo.completed}
                      id={`todo-${todo.id}`}
                      onCheckedChange={() =>
                        handleToggleTodo(todo.id, todo.completed)
                      }
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
                    onClick={() => handleDeleteTodo(todo.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
