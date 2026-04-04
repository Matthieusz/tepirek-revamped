import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/dashboard/events/maps")({
  component: RouteComponent,
  staticData: {
    crumb: "Rozdawanie map",
  },
});

function RouteComponent() {
  return (
    <ComingSoon
      description="Funkcja została tymczasowo wyłączona."
      feature="Rozdawanie map"
    />
  );
}
