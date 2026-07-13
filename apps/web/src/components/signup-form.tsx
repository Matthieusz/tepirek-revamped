import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Link, useNavigate } from "@tanstack/react-router";

import {
  BackToHomeButton,
  DiscordLoginButton,
} from "@/components/auth-buttons";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  authFormSubmission,
  handleSignupSuccess,
  submitWhenIdle,
} from "@/lib/auth-form-behavior";
import {
  EmailSchema,
  PasswordSchema,
  SignupNameSchema,
} from "@/lib/form-schemas";
import { cn } from "@/lib/utils";

const signupFormBuilder = FormBuilder.empty
  .addField("name", SignupNameSchema)
  .addField("email", EmailSchema)
  .addField("password", PasswordSchema);

interface SignupCredentials {
  readonly email: string;
  readonly name: string;
  readonly password: string;
}

type Signup = (
  credentials: SignupCredentials
) => ReturnType<typeof authClient.signUp.email>;

const signupForm = FormReact.make(signupFormBuilder, {
  fields: {
    email: EffectTextField,
    name: EffectTextField,
    password: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (signup: Signup, { decoded }) =>
    authFormSubmission("signup", () => signup(decoded)),
});

export const SignUpForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const navigate = useNavigate({ from: "/" });
  const signup = (credentials: SignupCredentials) =>
    authClient.signUp.email(credentials, {
      onSuccess: () =>
        handleSignupSuccess(() => navigate({ to: "/dashboard" })),
    });
  const submit = useAtomSet(signupForm.submit);
  const submitResult = useAtomValue(signupForm.submit);

  return (
    <signupForm.Initialize
      defaultValues={{ email: "", name: "", password: "" }}
    >
      <div
        className={cn("flex w-full max-w-sm flex-col gap-8", className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="font-serif font-bold tracking-tight text-foreground"
            style={{ fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.1 }}
          >
            Utwórz konto
          </h1>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-8">
          <DiscordLoginButton label="Kontynuuj przez Discord" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">lub</span>
            </div>
          </div>

          <form
            action={() =>
              submitWhenIdle(submitResult.waiting, () => submit(() => signup))
            }
          >
            <div className="flex flex-col gap-5">
              <signupForm.name
                autoComplete="name"
                label="Nazwa"
                placeholder="Marco Artenius"
                required
              />
              <signupForm.email
                autoComplete="email"
                label="E-mail"
                placeholder="m@example.com"
                required
                type="email"
              />
              <signupForm.password
                autoComplete="new-password"
                label="Hasło"
                required
                type="password"
              />
              <Button
                className="h-11 w-full font-semibold"
                disabled={submitResult.waiting}
                type="submit"
              >
                {submitResult.waiting ? "Wysyłanie..." : "Utwórz konto"}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Masz konto?{" "}
          <Link
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
            to="/login"
          >
            Zaloguj się
          </Link>
        </p>
        <div className="flex justify-center">
          <BackToHomeButton />
        </div>
      </div>
    </signupForm.Initialize>
  );
};
