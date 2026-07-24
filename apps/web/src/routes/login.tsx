import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import { createPageTitle } from "@/lib/metadata";
import LoginPage from "@/pages/(auth)/login";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [
      { title: createPageTitle("Logowanie") },
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
});
