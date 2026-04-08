import { SignUpForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <SignUpForm className="w-full max-w-md" />
    </div>
  );
}
