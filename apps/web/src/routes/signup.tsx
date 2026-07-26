import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignUpForm } from "@/components/signup-form";
import { getUser } from "@/functions/get-user";
import { createPageTitle } from "@/lib/metadata";

const SignupPage = () => (
  <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
    <SignUpForm />
  </div>
);

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
