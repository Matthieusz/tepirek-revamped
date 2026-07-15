import { createFileRoute } from "@tanstack/react-router";

import { RangeDetails } from "./range-details";

export const Route = createFileRoute("/dashboard/skills/$rangeName")({
  component: RangeDetails,
  loader: ({ params }) => ({ crumb: params.rangeName }),
});
