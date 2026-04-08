import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <LoginForm className="w-full max-w-md" />
    </div>
  );
}
