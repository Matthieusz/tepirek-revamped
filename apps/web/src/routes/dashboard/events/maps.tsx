import { createFileRoute } from "@tanstack/react-router";
import { MapAllocator } from "@/components/events/map-allocator";

export const Route = createFileRoute("/dashboard/events/maps")({
  component: RouteComponent,
  staticData: {
    crumb: "Rozdawanie map",
  },
});

function RouteComponent() {
  return <MapAllocator />;
}
