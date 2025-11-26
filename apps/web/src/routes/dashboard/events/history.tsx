import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/events/history")({
  component: RouteComponent,
  staticData: {
    crumb: "Historia obstawień",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Historia obstawień" />;
}
