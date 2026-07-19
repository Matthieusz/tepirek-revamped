import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/features/events/core/event-hero-filter";
import HistoryPage from "@/routes/dashboard/events/-components/history-page";

const routeApi = getRouteApi("/dashboard/events/history");

const HistoryRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <HistoryPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/history")({
  component: HistoryRoute,
  staticData: {
    crumb: "Historia obstawień",
  },
  validateSearch: Schema.decodeUnknownSync(
    Schema.Struct({
      eventId: Schema.optional(FilterIdSearchSchema),
      heroId: Schema.optional(FilterIdSearchSchema),
    })
  ),
});
