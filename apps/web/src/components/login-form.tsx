import { useForm } from "@tanstack/react-form";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const navigate = useNavigate({
    from: "/",
  });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            toast.success("Zalogowano pomyślnie");
            await router.invalidate();
            navigate({
              to: "/dashboard",
            });
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Nieprawidłowy adres e-mail"),
        password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
      }),
    },
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Zaloguj się do swojego konta</CardTitle>
          <CardDescription>
            Wprowadź swój adres e-mail poniżej, aby zalogować się na swoje konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="flex flex-col gap-6">
              <div>
                <form.Field name="email">
                  {(field) => (
                    <div className="grid gap-3">
                      <Label htmlFor={field.name}>Email</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
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
                        onChange={(e) => field.handleChange(e.target.value)}
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
                      {state.isSubmitting ? "Wysyłanie..." : "Zaloguj się"}
                    </Button>
                  )}
                </form.Subscribe>
                <Button
                  className="w-full"
                  onClick={async () => {
                    await authClient.signIn.social({
                      provider: "discord",
                      callbackURL: `${window.location.origin}/waiting-room`,
                      fetchOptions: {
                        onError: (error) => {
                          toast.error(
                            error.error.message || error.error.statusText
                          );
                        },
                      },
                    });
                  }}
                  variant="outline"
                >
                  Zaloguj się używając Discorda
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Nie masz konta?{" "}
              <Link
                className="text-primary underline underline-offset-4"
                to={"/signup"}
              >
                Zarejestruj się
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <Button variant={"ghost"}>
        <Link className="flex items-center gap-2" to={"/"}>
          <ArrowLeft />
          Powrót do strony głównej
        </Link>
      </Button>
    </div>
  );
}
