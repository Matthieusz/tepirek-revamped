import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginForm } from "@/components/login-form";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/login")({
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
      <LoginForm className="w-full max-w-md" />
    </div>
  );
}
