import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@/components/signup-form";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="container mx-auto flex h-screen max-w-3xl items-center justify-center">
      <SignUpForm className="mx-auto w-full max-w-md" />
    </div>
  );
}
