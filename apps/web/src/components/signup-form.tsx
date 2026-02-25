import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Utwórz konto</CardTitle>
          <CardDescription>
            Wprowadź swój adres e-mail poniżej, aby utworzyć konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            // oxlint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await form.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-6">
              <div>
                <form.Field name="name">
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name}>Nazwa</Label>
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
                          className="text-red-500 text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
              <div>
                <form.Field name="email">
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name}>Email</Label>
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
                          className="text-red-500 text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
              <div>
                <form.Field name="password">
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name}>Hasło</Label>
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
                          className="text-red-500 text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
              <div className="flex flex-col gap-2">
                <form.Subscribe>
                  {(state) => (
                    <Button
                      className="w-full"
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {state.isSubmitting ? "Wysyłanie..." : "Utwórz konto"}
                    </Button>
                  )}
                </form.Subscribe>
                <Button
                  className="w-full"
                  // oxlint-disable-next-line @typescript-eslint/no-misused-promises
                  onClick={async () => {
                    await authClient.signIn.social({
                      callbackURL: `${window.location.origin}/waiting-room`,
                      fetchOptions: {
                        onError: (error) => {
                          toast.error(
                            error.error.message === ""
                              ? error.error.statusText
                              : error.error.message
                          );
                        },
                      },
                      provider: "discord",
                    });
                  }}
                  variant="outline"
                >
                  Zaloguj się używając Discorda
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Masz konto?{" "}
              <Link
                className="text-primary underline underline-offset-4"
                to="/login"
              >
                Zaloguj się
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <Button variant="ghost">
        <Link className="flex items-center gap-2" to="/">
          <ArrowLeft />
          Powrót do strony głównej
        </Link>
      </Button>
    </div>
  );
};
