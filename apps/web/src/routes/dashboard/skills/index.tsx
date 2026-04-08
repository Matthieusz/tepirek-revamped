import { createFileRoute } from "@tanstack/react-router";

import { requireVerified } from "@/lib/route-helpers";
import SkillsIndexPage from "@/pages/dashboard/skills/index";

export const Route = createFileRoute("/dashboard/skills/")({
  beforeLoad: async () => {
    const session = await requireVerified();
    return { session };
  },
  component: function SkillsIndexRoute() {
    const { session } = Route.useRouteContext();
    return <SkillsIndexPage session={session} />;
  },
  staticData: {
    crumb: "Lista przedziałów",
  },
});
