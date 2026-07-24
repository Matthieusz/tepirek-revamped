import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { todosAtom } from "@/features/todos/todo-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import TasksPage from "@/routes/dashboard/-components/tasks-page";

const routeApi = getRouteApi("/dashboard/tasks");

const TasksRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <TasksPage session={session} />;
};

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [todosAtom]),
  staticData: {
    crumb: "Zadania",
  },
});
