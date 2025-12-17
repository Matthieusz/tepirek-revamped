import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Clock, Loader2, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { requireUnverified } from "@/lib/auth-guard";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/waiting-room")({
  async beforeLoad() {
    const session = await requireUnverified();
    return { session };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = Route.useNavigate();
  const { session } = Route.useRouteContext();
  const [isValidating, setIsValidating] = useState(false);

  // Fetch Discord access token
  const { data: accessToken } = useQuery(
    orpc.user.getDiscordAccessToken.queryOptions()
  );

  // Validate Discord guild membership on mount and when access token is available
  useEffect(() => {
    async function validateAndRedirect() {
      if (!accessToken || isValidating) {
        return;
      }

      setIsValidating(true);
      try {
        const result = await orpc.user.validateDiscordGuild.call({
          accessToken,
        });
        if (result?.valid) {
          await orpc.user.verifySelf.call();
          await router.invalidate();
          navigate({ to: "/dashboard" });
        }
      } catch (error) {
        // Discord validation failed, stay on waiting room
        console.error("Discord validation failed:", error);
      } finally {
        setIsValidating(false);
      }
    }

    validateAndRedirect();
  }, [accessToken, isValidating, navigate, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Waiting Card */}
        <Card className="border-none bg-linear-to-br from-primary/15 via-primary/5 to-transparent text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Oczekiwanie na weryfikację
            </CardTitle>
            <CardDescription className="text-base">
              Poczekaj na weryfikację przez admina i odśwież stronę
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Clock className="size-4" />
              <span>W trakcie weryfikacji</span>
            </div>
            <Button
              className="w-full"
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw className="size-4" />
              Odśwież stronę
            </Button>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Zalogowano jako:{" "}
              <span className="font-medium text-foreground">
                {session.user.name}
              </span>
            </p>
            <Button
              onClick={() =>
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      toast.success("Wylogowano pomyślnie");
                      navigate({
                        to: "/",
                      });
                    },
                    onError: (error) => {
                      toast.error(
                        error.error.message || error.error.statusText
                      );
                    },
                  },
                })
              }
              size="sm"
              type="button"
              variant="destructive"
            >
              <LogOut className="size-4" />
              Wyloguj się
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
