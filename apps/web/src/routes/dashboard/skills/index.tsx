import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { skillRangesAtom } from "@/features/skills/skill-atoms";
import { preloadAtomResults } from "@/lib/atom-preload";

import SkillsIndexPage from "./-components/skills-index-page";

const routeApi = getRouteApi("/dashboard/skills/");

const SkillsIndexRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <SkillsIndexPage session={session} />;
};

export const Route = createFileRoute("/dashboard/skills/")({
  component: SkillsIndexRoute,
  loader: ({ context }) =>
    preloadAtomResults(context.atomRegistry, [skillRangesAtom]),
  staticData: {
    crumb: "Lista przedziałów",
  },
});
