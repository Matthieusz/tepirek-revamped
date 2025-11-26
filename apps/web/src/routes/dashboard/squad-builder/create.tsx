import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/squad-builder/create")({
  component: RouteComponent,
  staticData: {
    crumb: "Tworzenie nowej drużyny",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/squad-builder/create-new"!</div>;
}
