import { useAtomSet } from "@effect/atom-react";
import {
  LoaderCircleIcon,
  LogOutIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
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
import { verifyDiscordGuildMembershipAtom } from "@/features/users/user-atoms";
import { authClient } from "@/lib/auth-client";
import type { AuthSession } from "@/types/route";

interface WaitingRoomPageProps {
  session: AuthSession;
}

const WaitingRoomPage = ({ session }: WaitingRoomPageProps) => {
  const router = useRouter();
  const verifyDiscordGuildMembership = useAtomSet(
    verifyDiscordGuildMembershipAtom,
    { mode: "promise" }
  );
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
        const result = await verifyDiscordGuildMembership();
        if (result?.valid) {
          await router.invalidate();
          await router.navigate({ to: "/dashboard" });
        }
      } catch {
        toast.error(
          "Nie udało się zweryfikować przynależności do gildii Discord"
        );
      }
      isValidatingRef.current = false;
    };

    void validateAndRedirect();
  }, [router, verifyDiscordGuildMembership]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onError: (error) => {
          toast.error(error.error.message ?? error.error.statusText);
        },
        onSuccess: () => {
          toast.success("Wylogowano pomyślnie");
          void router.navigate({ to: "/" });
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Waiting Card */}
        <Card className="from-primary/15 via-primary/5 border-none bg-linear-to-br to-transparent text-center">
          <CardHeader>
            <div className="bg-primary/10 ring-primary/5 mx-auto mb-4 flex size-16 items-center justify-center rounded-full ring-4">
              <HugeiconsIcon
                aria-hidden="true"
                icon={LoaderCircleIcon}
                className="text-primary size-8 animate-spin"
              />
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
              <HugeiconsIcon
                aria-hidden="true"
                icon={RefreshIcon}
                className="size-4"
              />
              Odśwież stronę
            </Button>
          </CardContent>
        </Card>

        {/* User Info Card */}
        <Card>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Zalogowano jako:{" "}
              <span className="text-foreground font-medium">
                {session.user.name}
              </span>
            </p>
            <Button
              onClick={() => {
                void handleSignOut();
              }}
              size="sm"
              type="button"
              variant="destructive"
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={LogOutIcon}
                className="size-4"
              />
              Wyloguj się
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaitingRoomPage;
