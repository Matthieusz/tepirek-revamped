import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/squad-builder/manage")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj drużynami",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/squad-builder/manage-squads"!</div>;
}
