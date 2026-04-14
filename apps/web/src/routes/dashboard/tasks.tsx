import { createFileRoute } from "@tanstack/react-router";

import TasksPage from "@/pages/dashboard/tasks";

export const Route = createFileRoute("/dashboard/tasks")({
  component: function TasksRoute() {
    const { session } = Route.useRouteContext();
    return <TasksPage session={session} />;
  },
  staticData: {
    crumb: "Zadania",
  },
});
