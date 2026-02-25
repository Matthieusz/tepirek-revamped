import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignUpForm } from "@/components/signup-form";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session?.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <SignUpForm className="w-full max-w-md" />
    </div>
  );
}
