import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignUpForm } from "@/components/signup-form";
import { createPageTitle } from "@/lib/metadata";

const SignupPage = () => (
  <div className="bg-background flex min-h-svh flex-col items-center justify-center px-4 py-12">
    <SignUpForm />
  </div>
);

export const Route = createFileRoute("/signup")({
  beforeLoad: async ({ context }) => {
    const session = await context.getUser();
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
