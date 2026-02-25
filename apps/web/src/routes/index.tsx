import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, LogIn, Swords, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

// oxlint-disable-next-line func-style
function HomeComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  let statusText: string;
  let statusColor = "text-muted-foreground";
  let statusDot = "bg-yellow-500";

  if (healthCheck.isLoading) {
    statusText = "Sprawdzanie...";
    statusDot = "bg-yellow-500 animate-pulse";
  } else if (healthCheck.data === undefined) {
    statusText = "Status";
    statusColor = "text-red-500";
    statusDot = "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]";
  } else {
    statusText = "Status";
    statusColor = "text-green-500";
    statusDot = "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]";
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* background glow */}
      <div className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-0 left-1/2 h-100 w-full max-w-3xl rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative z-10 w-full max-w-lg space-y-8 px-4">
        <div className="fade-in slide-in-from-bottom-8 mb-8 animate-in space-y-4 text-center duration-1000">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4 shadow-2xl shadow-primary/20 ring-1 ring-primary/25">
            <Swords className="size-12 text-primary" />
          </div>
          <h1 className="font-extrabold text-5xl text-foreground tracking-tight drop-shadow-sm lg:text-7xl">
            Tepirek{" "}
            <span className="bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              Revamped
            </span>
          </h1>
          <p className="mx-auto max-w-sm font-medium text-muted-foreground text-xl">
            Strona klanowa Gildii Złodziei.
          </p>
        </div>

        <Card className="fade-in slide-in-from-bottom-12 animate-in bg-background/60 fill-mode-both backdrop-blur-2xl delay-150 duration-1000">
          <CardContent className="flex flex-col gap-4 p-8">
            <Button
              asChild
              className="group h-14 font-bold text-base tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              size="lg"
            >
              <Link
                className="flex w-full items-center justify-center gap-2"
                to="/login"
              >
                <LogIn className="group-hover:-translate-x-1 size-5 transition-transform" />
                Zaloguj się
              </Link>
            </Button>
            <Button
              asChild
              className="group h-14 font-bold text-base tracking-wide transition-all hover:bg-primary/5 active:scale-[0.98]"
              size="lg"
              variant="outline"
            >
              <Link
                className="flex w-full items-center justify-center gap-2"
                to="/signup"
              >
                <UserPlus className="size-5 transition-transform group-hover:scale-110" />
                Utwórz konto
              </Link>
            </Button>
          </CardContent>

          <CardFooter className="flex-col items-center justify-between gap-4 rounded-b-xl  p-6 sm:flex-row">
            <div className="flex items-center gap-3 rounded-full border border-border/50 bg-background/80 px-4 py-2 shadow-sm backdrop-blur-md">
              <div className="relative flex h-3 w-3">
                {healthCheck.isLoading && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${statusDot}`}
                />
              </div>
              <span
                className={`font-bold text-sm uppercase tracking-wider ${statusColor}`}
              >
                {statusText}
              </span>
            </div>

            <Button
              asChild
              className="rounded-full px-4 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
              size="sm"
              variant="ghost"
            >
              <a
                className="gap-2 font-semibold text-xs uppercase tracking-wide"
                href="https://uptime.informati.dev/status/tepirek"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Link2 className="size-4" />
                Status strony
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
