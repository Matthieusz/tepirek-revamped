import { createFileRoute, redirect } from "@tanstack/react-router";

import { SignUpForm } from "@/components/signup-form";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/signup")({
  beforeLoad: async () => {
    const session = await getUser();
    if (session?.user) {
      // oxlint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/dashboard" });
    }
  },
  component: RouteComponent,
});

// oxlint-disable-next-line func-style
function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <SignUpForm className="w-full max-w-md" />
    </div>
  );
}
