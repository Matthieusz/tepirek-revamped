import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
  staticData: {
    crumb: "Zadania",
  },
});

function TasksRoute() {
  const [newTodoText, setNewTodoText] = useState("");
  const { data: session } = authClient.useSession();

  const todos = useQuery(orpc.todo.getAll.queryOptions());
  const createMutation = useMutation(
    orpc.todo.create.mutationOptions({
      onSuccess: () => {
        todos.refetch();
        setNewTodoText("");
      },
    })
  );
  const toggleMutation = useMutation(
    orpc.todo.toggle.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    })
  );
  const deleteMutation = useMutation(
    orpc.todo.delete.mutationOptions({
      onSuccess: () => {
        todos.refetch();
      },
    })
  );

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim() && session?.user.id) {
      createMutation.mutate({ text: newTodoText, userId: session.user.id });
    }
  };

  const handleToggleTodo = (id: number, completed: boolean) => {
    toggleMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTodo = (id: number) => {
    deleteMutation.mutate({ id });
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="mb-8 font-bold text-3xl">Lista zadań</h1>
      <Card>
        <CardContent>
          <form
            className="mb-6 flex items-center space-x-2"
            onSubmit={handleAddTodo}
          >
            <Input
              disabled={createMutation.isPending}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Dodaj nowe zadanie..."
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

          {todos.isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!todos.isLoading && todos.data?.length === 0 && (
            <p className="py-4 text-center">Brak zadań</p>
          )}
          {!todos.isLoading && todos.data && todos.data.length > 0 && (
            <ul className="space-y-2">
              {todos.data.map((todo) => (
                <li
                  className="flex items-center justify-between rounded-md border p-2"
                  key={todo.id}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={todo.completed}
                      id={`todo-${todo.id}`}
                      onCheckedChange={() =>
                        handleToggleTodo(todo.id, todo.completed)
                      }
                    />
                    <label
                      className={`${todo.completed ? "line-through" : ""}`}
                      htmlFor={`todo-${todo.id}`}
                    >
                      {todo.text}
                    </label>
                  </div>
                  <Button
                    aria-label="Usuwanie zadania"
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
