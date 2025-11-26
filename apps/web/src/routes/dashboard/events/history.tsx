import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/history")({
  component: RouteComponent,
  staticData: {
    crumb: "Historia obstawięń",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/events/history"!</div>;
}
