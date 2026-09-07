import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { todosQueryOptions } from "@/features/todos/todo-queries";
import TasksPage from "@/routes/dashboard/-components/tasks-page";

const routeApi = getRouteApi("/dashboard/tasks");

const TasksRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <TasksPage session={session} />;
};

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(todosQueryOptions());
  },
  staticData: {
    crumb: "Zadania",
  },
});
