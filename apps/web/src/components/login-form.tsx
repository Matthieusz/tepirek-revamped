import { useSelector } from "@tanstack/react-form";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { toast } from "sonner";

import {
  BackToHomeButton,
  DiscordLoginButton,
} from "@/components/auth-buttons";
import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  handleLoginSuccess,
  runAuthFormSubmission,
} from "@/lib/auth-form-behavior";
import type { AuthFormSubmissionError } from "@/lib/auth-form-behavior";
import { EmailSchema, PasswordSchema } from "@/lib/form-schemas";
import { cn } from "@/lib/utils";

const LoginFormSchema = Schema.Struct({
  email: EmailSchema,
  password: PasswordSchema,
});
const LoginFormValidator = Schema.toStandardSchemaV1(LoginFormSchema);

interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

type Login = (
  credentials: LoginCredentials
) => ReturnType<typeof authClient.signIn.email>;

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const navigate = useNavigate({ from: "/" });
  const [submissionFailure, setSubmissionFailure] =
    useState<AuthFormSubmissionError>();
  const login: Login = (credentials) =>
    authClient.signIn.email(credentials, {
      onSuccess: () =>
        handleLoginSuccess({
          invalidate: () => router.invalidate(),
          navigate: () => navigate({ to: "/dashboard" }),
          notifySuccess: toast.success,
        }),
    });
  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await LoginFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runAuthFormSubmission("login", () =>
        login(decoded.value)
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
      }
    },
    validators: { onSubmit: LoginFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <div
      className={cn("flex w-full max-w-sm flex-col gap-8", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1
          className="text-foreground font-serif font-bold tracking-tight"
          style={{ fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.1 }}
        >
          Zaloguj się
        </h1>
      </div>

      <div className="border-border bg-card flex flex-col gap-6 rounded-xl border p-8">
        <DiscordLoginButton />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card text-muted-foreground px-2">lub</span>
          </div>
        </div>

        <Form form={form}>
          <div className="flex flex-col gap-5">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  autoComplete="email"
                  label="E-mail"
                  placeholder="m@example.com"
                  required
                  type="email"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  autoComplete="current-password"
                  label="Hasło"
                  required
                  type="password"
                />
              )}
            </form.AppField>
            <FormFeedback failure={submissionFailure} />
            <Button
              className="h-11 w-full font-semibold"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Wysyłanie..." : "Zaloguj się"}
            </Button>
          </div>
        </Form>
      </div>

      <p className="text-muted-foreground text-center text-sm">
        Nie masz konta?{" "}
        <Link
          className="text-primary hover:text-primary/80 inline-flex min-h-6 items-center font-medium underline underline-offset-4 transition-colors"
          to="/signup"
        >
          Zarejestruj się
        </Link>
      </p>
      <div className="flex justify-center">
        <BackToHomeButton />
      </div>
    </div>
  );
};
