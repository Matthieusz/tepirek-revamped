import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form";
import { getUser } from "@/functions/get-user";
import { createPageTitle } from "@/lib/metadata";

const LoginPage = () => (
  <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
    <LoginForm />
  </div>
);

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
