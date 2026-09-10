import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { heroesQueryOptions } from "@/features/events/heroes/hero-queries";
import { verifiedUsersQueryOptions } from "@/features/users/user-queries";
import { BetsAddPage } from "@/routes/dashboard/events/-components/bets-add-page";
import {
  EventsRouteError,
  EventsRoutePending,
} from "@/routes/dashboard/events/-components/route-states";

const routeApi = getRouteApi("/dashboard/events/bets/add");

const BetsAddRoute = () => {
  const { session } = routeApi.useRouteContext();

  return <BetsAddPage session={session} />;
};

export const Route = createFileRoute("/dashboard/events/bets/add")({
  component: BetsAddRoute,
  errorComponent: EventsRouteError,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(eventsQueryOptions()),
      context.queryClient.query(heroesQueryOptions()),
      context.queryClient.query(verifiedUsersQueryOptions()),
    ]);
  },
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});
