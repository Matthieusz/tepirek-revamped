import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="container mx-auto flex h-screen max-w-3xl items-center justify-center">
      <LoginForm className="mx-auto w-full max-w-md" />
    </div>
  );
}
