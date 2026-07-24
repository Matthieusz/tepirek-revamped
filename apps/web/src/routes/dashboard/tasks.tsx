import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import TasksPage from "@/routes/dashboard/-components/tasks-page";

const routeApi = getRouteApi("/dashboard/tasks");

const TasksRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <TasksPage session={session} />;
};

export const Route = createFileRoute("/dashboard/tasks")({
  component: TasksRoute,
  staticData: {
    crumb: "Zadania",
  },
});
