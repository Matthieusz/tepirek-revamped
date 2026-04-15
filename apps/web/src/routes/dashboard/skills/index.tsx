import { createFileRoute } from "@tanstack/react-router";

import SkillsIndexPage from "@/pages/dashboard/skills/index";

export const Route = createFileRoute("/dashboard/skills/")({
  component: function SkillsIndexRoute() {
    const { session } = Route.useRouteContext();
    return <SkillsIndexPage session={session} />;
  },
  staticData: {
    crumb: "Lista przedziałów",
  },
});
