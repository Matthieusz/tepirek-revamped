import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/squad-builder/manage")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj drużynami",
  },
});

function RouteComponent() {
  return <ComingSoon feature="Zarządzanie drużynami" />;
}
