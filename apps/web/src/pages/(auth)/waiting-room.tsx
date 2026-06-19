import { useRouter } from "@tanstack/react-router";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
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
import type { AuthSession } from "@/types/route";
import { orpc } from "@/utils/orpc";

interface WaitingRoomPageProps {
  session: AuthSession;
}

export default function WaitingRoomPage({ session }: WaitingRoomPageProps) {
  const router = useRouter();
  const isValidatingRef = useRef(false);
  const hasValidated = useRef(false);

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (hasValidated.current || isValidatingRef.current) {
        return;
      }

      hasValidated.current = true;
      isValidatingRef.current = true;
      try {
        const result = await orpc.user.verifyDiscordGuildMembership.call();
        if (result?.valid) {
          await router.invalidate();
          await router.navigate({ to: "/dashboard" });
        }
      } catch {
        toast.error(
          "Nie udało się zweryfikować przynależności do gildii Discord"
        );
      } finally {
        isValidatingRef.current = false;
      }
    };

    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    validateAndRedirect();
  }, [router]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onError: (error) => {
          toast.error(error.error.message ?? error.error.statusText);
        },
        onSuccess: () => {
          toast.success("Wylogowano pomyślnie");
          // oxlint-disable-next-line @typescript-eslint/no-floating-promises
          router.navigate({ to: "/" });
        },
      },
    });
  };

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
            <Button
              className="mt-4 w-full"
              onClick={() => {
                window.location.reload();
              }}
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
              onClick={handleSignOut}
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
