import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/calculator/odw")({
  component: RouteComponent,
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});

function RouteComponent() {
  return <div>Hello "/dashboard/calculator/odw"!</div>;
}
