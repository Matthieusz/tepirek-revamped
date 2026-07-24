import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import { createPageTitle } from "@/lib/metadata";
import SignupPage from "@/routes/-components/signup-page";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SignupPage,
  head: () => ({
    meta: [
      { title: createPageTitle("Rejestracja") },
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
});
