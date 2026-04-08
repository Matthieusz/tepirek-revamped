import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import TasksPage from "@/pages/dashboard/tasks";

export const Route = createFileRoute("/dashboard/tasks")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function TasksRoute() {
    const { session } = Route.useRouteContext();
    return <TasksPage session={session} />;
  },
  staticData: {
    crumb: "Zadania",
  },
});
