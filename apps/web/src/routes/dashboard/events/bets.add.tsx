import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";
import { verifiedUsersAtom } from "@/lib/user-atoms";
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
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [
      eventsAtom,
      heroesAtom,
      verifiedUsersAtom,
    ]),
  pendingComponent: EventsRoutePending,
  staticData: {
    crumb: "Dodaj obstawienie",
  },
});
