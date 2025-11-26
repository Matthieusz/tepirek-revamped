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
    <div className="container mx-auto flex h-screen max-w-3xl items-center justify-center">
      <LoginForm className="mx-auto w-full max-w-md" />
    </div>
  );
}
