import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form";
import { createPageTitle } from "@/lib/metadata";

const LoginPage = () => (
  <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-12">
    <LoginForm />
  </div>
);

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context }) => {
    const session = await context.getUser();
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
