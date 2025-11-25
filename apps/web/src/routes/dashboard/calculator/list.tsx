import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/calculator/list")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Kalkulator lista",
  }),
});

function RouteComponent() {
  return <div>Hello "/dashboard/calculator/list"!</div>;
}
