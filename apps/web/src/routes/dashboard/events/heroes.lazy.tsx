import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";

import EventsHeroesPage from "@/routes/dashboard/events/-components/heroes-page";

const routeApi = getRouteApi("/dashboard/events/heroes");

const EventsHeroesRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <EventsHeroesPage session={session} />;
};

export const Route = createLazyFileRoute("/dashboard/events/heroes")({
  component: EventsHeroesRoute,
});
