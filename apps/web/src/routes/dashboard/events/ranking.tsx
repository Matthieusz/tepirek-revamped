import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/events/ranking")({
  component: RouteComponent,
  staticData: {
    crumb: "Ranking",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Ranking eventów" />;
}
