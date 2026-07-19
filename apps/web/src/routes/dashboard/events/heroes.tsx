import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/events/heroes")({
  staticData: {
    crumb: "Herosi",
  },
});
