import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import LoginPage from "@/pages/(auth)/login";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});
