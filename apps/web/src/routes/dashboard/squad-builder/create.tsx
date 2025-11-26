import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/squad-builder/create")({
  component: RouteComponent,
  staticData: {
    crumb: "Tworzenie nowej drużyny",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Tworzenie drużyny" />;
}
