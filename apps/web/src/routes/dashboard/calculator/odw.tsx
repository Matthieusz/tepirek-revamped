import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/calculator/odw")({
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});
