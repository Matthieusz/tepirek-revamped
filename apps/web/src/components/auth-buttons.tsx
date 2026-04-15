import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const BackToHomeButton = () => (
  <Button variant="ghost">
    <Link className="flex items-center gap-2" to="/">
      <ArrowLeft />
      Powrót do strony głównej
    </Link>
  </Button>
);

export const DiscordLoginButton = ({
  label = "Zaloguj się używając Discorda",
}: {
  label?: string;
}) => (
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
    {label}
  </Button>
);
