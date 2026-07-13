import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";

import {
  BackToHomeButton,
  DiscordLoginButton,
} from "@/components/auth-buttons";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  authFormSubmission,
  handleLoginSuccess,
  submitWhenIdle,
} from "@/lib/auth-form-behavior";
import { EmailSchema, PasswordSchema } from "@/lib/form-schemas";
import { cn } from "@/lib/utils";

const loginFormBuilder = FormBuilder.empty
  .addField("email", EmailSchema)
  .addField("password", PasswordSchema);

interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

type Login = (
  credentials: LoginCredentials
) => ReturnType<typeof authClient.signIn.email>;

const loginForm = FormReact.make(loginFormBuilder, {
  fields: {
    email: EffectTextField,
    password: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (login: Login, { decoded }) =>
    authFormSubmission("login", () => login(decoded)),
});

export const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const router = useRouter();
  const navigate = useNavigate({ from: "/" });
  const login = (credentials: LoginCredentials) =>
    authClient.signIn.email(credentials, {
      onSuccess: () =>
        handleLoginSuccess({
          invalidate: () => router.invalidate(),
          navigate: () => navigate({ to: "/dashboard" }),
        }),
    });
  const submit = useAtomSet(loginForm.submit);
  const submitResult = useAtomValue(loginForm.submit);

  return (
    <loginForm.Initialize defaultValues={{ email: "", password: "" }}>
      <div
        className={cn("flex w-full max-w-sm flex-col gap-8", className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="font-serif font-bold tracking-tight text-foreground"
            style={{ fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.1 }}
          >
            Zaloguj się
          </h1>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-8">
          <DiscordLoginButton />
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
              submitWhenIdle(submitResult.waiting, () => submit(() => login))
            }
          >
            <div className="flex flex-col gap-5">
              <loginForm.email
                autoComplete="email"
                label="E-mail"
                placeholder="m@example.com"
                required
                type="email"
              />
              <loginForm.password
                autoComplete="current-password"
                label="Hasło"
                required
                type="password"
              />
              <Button
                className="h-11 w-full font-semibold"
                disabled={submitResult.waiting}
                type="submit"
              >
                {submitResult.waiting ? "Wysyłanie..." : "Zaloguj się"}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link
            className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
            to="/signup"
          >
            Zarejestruj się
          </Link>
        </p>
        <div className="flex justify-center">
          <BackToHomeButton />
        </div>
      </div>
    </loginForm.Initialize>
  );
};
