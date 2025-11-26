import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  component: RouteComponent,
  staticData: {
    crumb: "Ustawienia",
  },
});

function RouteComponent() {
  return <div>WIP</div>;
}
