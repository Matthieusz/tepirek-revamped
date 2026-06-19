import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import {
  BackToHomeButton,
  DiscordLoginButton,
} from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const SignUpForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const navigate = useNavigate({
    from: "/",
  });

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          password: value.password,
          role: "user",
          verified: false,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: async () => {
            await navigate({
              to: "/dashboard",
            });
            toast.success("Zarejestrowano pomyślnie");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Nieprawidłowy adres e-mail"),
        name: z.string().min(2, "Nazwa musi mieć conajmniej 2 znaki"),
        password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
      }),
    },
  });

  return (
    <div
      className={cn("flex w-full max-w-sm flex-col gap-8", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1
          className="font-serif font-bold tracking-tight text-foreground"
          style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            lineHeight: 1.1,
          }}
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
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-5">
            <form.Field name="name">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor={field.name}>
                    Nazwa
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    placeholder="Marco Artenius"
                    required
                    type="text"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-sm"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor={field.name}>
                    Email
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    placeholder="m@example.com"
                    required
                    type="email"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-sm"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor={field.name}>
                    Hasło
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                    }}
                    required
                    type="password"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      className="text-destructive text-sm"
                      key={error?.message}
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <Button
                  className="h-11 w-full font-semibold"
                  disabled={!state.canSubmit || state.isSubmitting}
                  type="submit"
                >
                  {state.isSubmitting ? "Wysyłanie..." : "Utwórz konto"}
                </Button>
              )}
            </form.Subscribe>
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
  );
};
