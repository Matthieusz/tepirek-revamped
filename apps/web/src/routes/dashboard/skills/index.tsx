import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import SkillsIndexPage from "./-components/skills-index-page";

const routeApi = getRouteApi("/dashboard/skills/");

const SkillsIndexRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <SkillsIndexPage session={session} />;
};

export const Route = createFileRoute("/dashboard/skills/")({
  component: SkillsIndexRoute,
  staticData: {
    crumb: "Lista przedziałów",
  },
});
