import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { skillRangesQueryOptions } from "@/features/skills/skill-queries";

import SkillsIndexPage from "./-components/skills-index-page";

const routeApi = getRouteApi("/dashboard/skills/");

const SkillsIndexRoute = () => {
  const { session } = routeApi.useRouteContext();
  return <SkillsIndexPage session={session} />;
};

export const Route = createFileRoute("/dashboard/skills/")({
  component: SkillsIndexRoute,
  loader: async ({ context }) => {
    await context.queryClient.query(skillRangesQueryOptions());
  },
  staticData: {
    crumb: "Lista przedziałów",
  },
});
